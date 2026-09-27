import { createHash, randomUUID } from 'node:crypto';
import { excerptData, eventView, recentWindow } from './window.mjs';

const TYPES = new Set(['tool/call', 'tool/result', 'assistant/message', 'turn/end']);
const MAX_STORED_EVENT_BYTES = 256 * 1024;
const MAX_DIALOGUE_USERS = 6;
const MAX_ASSISTANT_PER_USER = 2;
const MAX_DIALOGUE_BYTES = 16 * 1024;
const MAX_DIALOGUE_MESSAGE_BYTES = 8 * 1024;
function visibleText(blocks) {
  if (!Array.isArray(blocks)) return { text: '', incomplete: true };
  const text = [];
  let incomplete = false;
  for (const block of blocks) {
    if (block.type === 'text' && typeof block.text === 'string') text.push(block.text);
    else if (!['reasoning', 'tool-call'].includes(block.type)) incomplete = true;
  }
  return { text: text.join('\n'), incomplete };
}

function trimDialogueEntry(row, beforeUserMessageIds, maxBytes) {
  // eventView keeps this representation aligned with other public execution
  // evidence, including stored truncation markers.
  const view = eventView({...row,data:JSON.parse(row.body)}, 65536);
  const entry = {
    id: view.id,
    seq: view.seq,
    text: typeof view.data.text === 'string' ? view.data.text : '',
    truncated: view.data.truncated === true || row.gap !== null,
    beforeUserMessageIds,
  };
  const baseBytes = Buffer.byteLength(JSON.stringify({...entry,text:''}));
  let used = 0, text = '';
  for (const character of entry.text) {
    const bytes = Buffer.byteLength(JSON.stringify(character)) - 2;
    if (baseBytes + used + bytes > maxBytes) break;
    text += character;
    used += bytes;
  }
  if (text.length !== entry.text.length) entry.truncated = true;
  entry.text = text;
  // A truncation marker itself can make a near-boundary entry one byte longer.
  // Re-run after setting it, preserving a valid UTF-8 / JSON boundary.
  while (Buffer.byteLength(JSON.stringify(entry)) > maxBytes && entry.text) {
    entry.text = entry.text.slice(0,-1);
    entry.truncated = true;
  }
  return Buffer.byteLength(JSON.stringify(entry)) <= maxBytes ? entry : null;
}
export function projectEvent(event) {
  if (!TYPES.has(event.type)) return null;
  const d = event.data;
  let body, gap = null;
  if (event.type === 'tool/call') {
    if (![d.callId, d.name, d.arguments].every(x => typeof x === 'string')) throw new Error('Malformed tool call');
    body = { callId: d.callId, name: d.name, arguments: d.arguments, fact: 'requested' };
  } else if (event.type === 'tool/result') {
    const result = d.message?.content?.[0];
    if (result?.type !== 'tool-result' || typeof result.toolCallId !== 'string') throw new Error('Malformed tool result');
    const visible = visibleText(result.content);
    body = { callId: result.toolCallId, text: visible.text, isError: result.isError === true, fact: 'tool-reported-result' };
    if (visible.incomplete) gap = 'unsupported-result-content';
  } else if (event.type === 'assistant/message') {
    const visible = visibleText(d.message?.content);
    if (!visible.text && !visible.incomplete) return null;
    body = { text: visible.text, interrupted: d.interrupted === true, fact: 'assistant-statement' };
    if (visible.incomplete) gap = 'unsupported-assistant-content';
  } else body = { turn: d.turn, reason: d.reason?.kind, fact: 'turn-lifecycle-only' };
  if (Buffer.byteLength(JSON.stringify(body)) > MAX_STORED_EVENT_BYTES) {
    body = excerptData(event.type, body, MAX_STORED_EVENT_BYTES - 512);
    body.truncated = true;
    gap = 'oversized-event';
  }
  return { body, gap };
}

export class ExecutionStore {
  constructor(ledger) {
    this.ledger = ledger;
    ledger.db.exec(`
      CREATE TABLE IF NOT EXISTS execution_events(id TEXT PRIMARY KEY, task TEXT NOT NULL REFERENCES tasks(id), seq INTEGER NOT NULL, type TEXT NOT NULL, body TEXT NOT NULL, gap TEXT, UNIQUE(task,seq));
      CREATE TABLE IF NOT EXISTS execution_gaps(task TEXT PRIMARY KEY REFERENCES tasks(id), reason TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS assessments(id TEXT PRIMARY KEY, task TEXT NOT NULL REFERENCES tasks(id), token TEXT NOT NULL, status TEXT NOT NULL, body TEXT, created TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS execution_call_lookup ON execution_events(task,CASE WHEN json_valid(body) THEN json_extract(body,'$.callId') END,seq) WHERE type='tool/call';
    `);
  }
  ingest(sessionId, event) {
    const task = this.ledger.db.prepare('SELECT id FROM tasks WHERE session=?').get(sessionId);
    if (!task) return false;
    const projection = projectEvent(event);
    if (!projection) return false;
    if (!Number.isSafeInteger(event.seq) || event.seq < 0) throw new Error('Invalid event sequence');
    return this.ledger.transaction(() => {
      const body = JSON.stringify(projection.body);
      const prior = this.ledger.db.prepare('SELECT * FROM execution_events WHERE task=? AND seq=?').get(task.id, event.seq);
      if (prior) {
        // Earlier versions stored only this explicit placeholder for >16KiB.
        // Replaying the same bound public session can recover its evidence;
        // all other changes to an existing event still fail closed.
        if (prior.type === event.type && prior.gap === 'oversized-event' && prior.body === JSON.stringify({omitted:true,fact:'oversized-public-event'})) {
          this.ledger.db.prepare('UPDATE execution_events SET body=?,gap=? WHERE id=?').run(body,projection.gap,prior.id);
          return true;
        }
        if (prior.type !== event.type || prior.body !== body || prior.gap !== projection.gap) throw new Error('Execution event conflict');
        return false;
      }
      this.ledger.db.prepare('INSERT INTO execution_events VALUES (?,?,?,?,?,?)').run(randomUUID(), task.id, event.seq, event.type, body, projection.gap);
      return true;
    });
  }
  markGap(taskId, reason) {
    this.ledger.db.prepare('INSERT OR REPLACE INTO execution_gaps VALUES (?,?)').run(taskId, reason);
  }
  reconcile(taskId, session) {
    if (!session) { this.markGap(taskId, 'history-unverified'); return; }
    const prior = this.ledger.db.prepare('SELECT seq FROM execution_events WHERE task=?').all(taskId);
    if ((session.events[0]?.seq ?? 0) > 1 || prior.some(p => !session.events.some(e => e.seq === p.seq))) {
      this.markGap(taskId, 'history-unverified'); return;
    }
    this.ledger.transaction(() => {
      for (const event of session.events) this.ingest(session.id, event);
      this.ledger.db.prepare("DELETE FROM execution_gaps WHERE task=? AND reason='history-unverified'").run(taskId);
    });
  }
  conversationContext(taskId, {fromVersion = 0} = {}) {
    if (!Number.isSafeInteger(fromVersion) || fromVersion < 0) throw new TypeError('Invalid context version');
    // Validate the bound task through the intent ledger.  Assistant text is
    // always read separately from the bounded public execution-event queries.
    this.ledger.snapshot(taskId);
    return this.ledger.transaction(() => {
      const totalUserMessages = this.ledger.db.prepare('SELECT COUNT(*) AS count FROM messages WHERE task=? AND version>?').get(taskId,fromVersion).count;
      const userMessages = this.ledger.db.prepare('SELECT id,seq FROM messages WHERE task=? AND version>? ORDER BY version DESC LIMIT ?').all(taskId,fromVersion,MAX_DIALOGUE_USERS).reverse();
      const preceding = this.ledger.db.prepare("SELECT * FROM execution_events WHERE task=? AND type='assistant/message' AND seq<? ORDER BY seq DESC LIMIT ?");
      const candidates = new Map();
      for (const user of userMessages) {
        for (const row of preceding.all(taskId,user.seq,MAX_ASSISTANT_PER_USER)) {
          const candidate = candidates.get(row.id) ?? {row,beforeUserMessageIds:[]};
          candidate.beforeUserMessageIds.push(user.id);
          candidates.set(row.id,candidate);
        }
      }
      let remaining = MAX_DIALOGUE_BYTES - 2;
      const assistantMessages = [];
      // Select newest public context first if the shared cap prevents every
      // otherwise eligible entry from fitting, then return it in transcript order.
      for (const candidate of [...candidates.values()].sort((a,b)=>b.row.seq-a.row.seq)) {
        const entry = trimDialogueEntry(candidate.row,candidate.beforeUserMessageIds,Math.min(MAX_DIALOGUE_MESSAGE_BYTES,remaining - (assistantMessages.length ? 1 : 0)));
        if (!entry) continue;
        assistantMessages.push(entry);
        remaining -= Buffer.byteLength(JSON.stringify(entry)) + (assistantMessages.length > 1 ? 1 : 0);
      }
      assistantMessages.sort((a,b)=>a.seq-b.seq);
      const includedIds = new Set(assistantMessages.flatMap(message=>message.beforeUserMessageIds));
      return {
        assistantMessages,
        coverage: {
          totalUserMessages,
          includedUserMessages: userMessages.length,
          omittedUserMessages: Math.max(0,totalUserMessages-userMessages.length),
          truncatedMessages: assistantMessages.filter(message=>message.truncated).length,
          missingContextForUserMessageIds: userMessages.filter(message=>!includedIds.has(message.id)).map(message=>message.id),
        },
      };
    });
  }
  snapshot(taskId) {
    return this.ledger.transaction(() => {
      const intent = this.ledger.snapshot(taskId);
      const messages = new Map(intent.messages.map(m => [m.id, m]));
      let epochSeq = intent.messages[0]?.seq ?? 0;
      for (const p of this.ledger.history(taskId)) {
        if (!['validated-proposal','needs-clarification'].includes(p.status) || p.version > (intent.currentVersion ?? 0)) continue;
        for (const update of p.body.updates ?? []) {
          // A resolved clarification can select a different task. Start a
          // conservative new assessment window instead of accusing the old task.
          if (['replacement','clarification'].includes(update.kind)) epochSeq = Math.max(epochSeq, messages.get(update.messageId)?.seq ?? 0);
        }
      }
      const stats = this.ledger.db.prepare('SELECT COUNT(*) AS count,MAX(seq) AS watermark,SUM(CASE WHEN gap IS NOT NULL THEN 1 ELSE 0 END) AS gapCount FROM execution_events WHERE task=? AND seq>=?').get(taskId, epochSeq);
      const candidateRows = this.ledger.db.prepare('SELECT * FROM execution_events WHERE task=? AND seq>=? ORDER BY seq DESC LIMIT 160').all(taskId, epochSeq);
      const rowsById = new Map(candidateRows.map(row => [row.id,row]));
      const pairedCall = this.ledger.db.prepare("SELECT * FROM execution_events WHERE task=? AND seq>=? AND type='tool/call' AND seq<? AND CASE WHEN json_valid(body) THEN json_extract(body,'$.callId') END=? ORDER BY seq DESC LIMIT 1");
      for (const row of candidateRows) {
        if (row.type !== 'tool/result') continue;
        const callId = JSON.parse(row.body).callId;
        if (typeof callId !== 'string') continue;
        const call = pairedCall.get(taskId,epochSeq,row.seq,callId);
        if (call) rowsById.set(call.id,call);
      }
      const rows = [...rowsById.values()].sort((a,b)=>a.seq-b.seq).map(row => ({...row,data:JSON.parse(row.body)}));
      const window = recentWindow(rows);
      const events = window.events;
      // Unsupported/missing evidence remains a hard coverage gap even when it
      // lies outside the compact model window.  Window omission itself is not.
      const coverage = this.ledger.db.prepare('SELECT DISTINCT gap FROM execution_events WHERE task=? AND seq>=? AND gap IS NOT NULL').all(taskId,epochSeq).map(row=>row.gap);
      const gap = this.ledger.db.prepare('SELECT reason FROM execution_gaps WHERE task=?').get(taskId);
      if (gap) coverage.push(gap.reason);
      const calls = new Set(events.filter(e => e.type === 'tool/call').map(e => e.data.callId));
      if (events.some(e => e.type === 'tool/result' && !calls.has(e.data.callId))) coverage.push('unpaired-tool-result');
      const requirements = [];
      const add = (id, claim) => {
        if (claim) requirements.push({ id, ...claim, sinceSeq: Math.max(...claim.evidence.map(ref => messages.get(ref.messageId)?.seq ?? epochSeq)) });
      };
      add('goal', intent.current?.goal);
      for (const key of ['requirements', 'acceptance', 'constraints', 'exclusions']) intent.current?.[key].forEach((claim, i) => add(`${key}:${i}`, claim));
      const selectedGapCount = rows.filter(row=>row.gap).length-window.history.omittedGapCount;
      const omittedEvents = stats.count-events.length;
      const history = {...window.history,totalEvents:stats.count,includedEvents:events.length,omittedEvents,
        throughSeq:stats.watermark??null,omittedGapCount:Math.max(0,(stats.gapCount??0)-selectedGapCount),
        mode:omittedEvents||window.history.truncatedEvents?'recent-window':'complete',partial:!!(omittedEvents||window.history.truncatedEvents)};
      const dialogueContext = this.conversationContext(taskId,{fromVersion:Math.max(0,intent.version-3)});
      const token = createHash('sha256').update(JSON.stringify({ intent, stats, coverage, events, history, dialogueContext })).digest('hex');
      return { taskId, token, inputVersion: intent.version, intentVersion: intent.currentVersion,
        intentReady: !!intent.current && intent.reviewedVersion === intent.version && !intent.questions.length && ['validated-proposal','inquiry'].includes(intent.status),
        intentStatus: intent.status, requirements, userEvidence: intent.messages.map(({id,seq,text}) => ({id,seq,text})),
        inferences: intent.current?.inferences ?? [], implementationUnknowns: intent.current?.implementationUnknowns ?? [], events, coverage: [...new Set(coverage)], epochSeq,
        history, dialogueContext, scope: 'public-text-and-tool-events', throughSeq: stats.watermark };
    });
  }
  evidence(taskId, eventId) {
    this.ledger.snapshot(taskId);
    if (typeof eventId !== 'string' || !eventId) throw new TypeError('Invalid event ID');
    const row = this.ledger.db.prepare('SELECT * FROM execution_events WHERE task=? AND id=?').get(taskId,eventId);
    return row ? eventView({...row,data:JSON.parse(row.body)},65536) : null;
  }
  page(taskId, {beforeSeq = null, limit = 40} = {}) {
    this.ledger.snapshot(taskId);
    if (!Number.isSafeInteger(limit) || limit < 1) throw new TypeError('Invalid page limit');
    limit = Math.min(limit,40);
    if (beforeSeq !== null && (!Number.isSafeInteger(beforeSeq) || beforeSeq < 0)) throw new TypeError('Invalid before sequence');
    const rows = beforeSeq === null
      ? this.ledger.db.prepare('SELECT * FROM execution_events WHERE task=? ORDER BY seq DESC LIMIT ?').all(taskId,limit)
      : this.ledger.db.prepare('SELECT * FROM execution_events WHERE task=? AND seq<? ORDER BY seq DESC LIMIT ?').all(taskId,beforeSeq,limit);
    rows.reverse();
    const events = rows.map(row => eventView({...row,data:JSON.parse(row.body)},65536));
    return {events,nextBeforeSeq:rows.length === limit ? rows[0].seq : null};
  }
  save(taskId, snapshot, status, body = null) {
    return this.ledger.transaction(() => {
      const stale = this.snapshot(taskId).token !== snapshot.token;
      const record = { id: randomUUID(), status: stale ? 'stale' : status, inputVersion: snapshot.inputVersion, intentVersion: snapshot.intentVersion, history: snapshot.history };
      this.ledger.db.prepare('INSERT INTO assessments(id,task,token,status,body,created) VALUES (?,?,?,?,?,?)').run(record.id, taskId, snapshot.token, record.status,
        JSON.stringify({ snapshot, result: body }), new Date().toISOString());
      return { ...record, ...(stale ? {} : { result: body }) };
    });
  }
  history(taskId) {
    this.ledger.snapshot(taskId);
    return this.ledger.db.prepare('SELECT id,status,body,created FROM assessments WHERE task=? ORDER BY rowid').all(taskId)
      .map(row => ({ ...row, body: JSON.parse(row.body) }));
  }
}
