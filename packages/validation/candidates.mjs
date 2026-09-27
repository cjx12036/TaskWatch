import { createHash, randomUUID } from 'node:crypto';

const MAX_CAPTURE_BYTES = 512 * 1024;
const SENSITIVE_KEY = /(?:reasoning|credential|password|secret|api[_-]?key|authorization|cookie|access[_-]?token|refresh[_-]?token)/i;
const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const canonical = value => JSON.stringify(value);
const sha256 = value => createHash('sha256').update(canonical(value)).digest('hex');
const clone = value => structuredClone(value);

function requiredString(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > 512) throw new TypeError(`Invalid ${label}`);
  return value;
}
function boundedInteger(value, label, { nullable = false } = {}) {
  if (nullable && value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`Invalid ${label}`);
  return value;
}
function publicValue(value, depth = 0, key = '') {
  if (depth > 24) throw new TypeError('Public evidence nesting is too deep');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (key === 'arguments') {
      try { return canonical(publicValue(JSON.parse(value), depth + 1)); } catch (error) { if (!(error instanceof SyntaxError)) throw error; }
    }
    return /\b(?:bearer|basic)\s+\S+/i.test(value) ? '[redacted]' : value;
  }
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw new TypeError('Public evidence must be JSON'); return value; }
  if (Array.isArray(value)) return value.map(item => publicValue(item, depth + 1));
  if (!isPlainObject(value)) throw new TypeError('Public evidence must be plain JSON');
  const out = {};
  for (const key of Object.keys(value).sort()) {
    if (SENSITIVE_KEY.test(key)) continue;
    out[key] = publicValue(value[key], depth + 1, key);
  }
  return out;
}
function evidenceRefs(report) {
  const events = new Set(), users = new Set();
  for (const finding of report?.result?.findings ?? []) {
    if (!isPlainObject(finding)) throw new TypeError('Invalid report finding');
    for (const id of finding.evidenceIds ?? []) events.add(requiredString(id, 'report evidence ID'));
    for (const id of finding.userMessageIds ?? []) users.add(requiredString(id, 'report user evidence ID'));
  }
  return { events, users };
}
function sanitizeEvidence(taskId, snapshot) {
  if (!isPlainObject(snapshot)) throw new TypeError('Invalid evidence snapshot');
  if (snapshot.taskId !== taskId) throw new Error('Evidence snapshot does not belong to the bound task');
  const cutoff = boundedInteger(snapshot.throughSeq, 'evidence cutoff', { nullable: true });
  const eventRows = Array.isArray(snapshot.events) ? snapshot.events : (() => { throw new TypeError('Evidence events are required'); })();
  const userRows = Array.isArray(snapshot.userEvidence) ? snapshot.userEvidence : (() => { throw new TypeError('User evidence is required'); })();
  const eventIds = new Set(), userIds = new Set();
  for (const row of eventRows) {
    if (!isPlainObject(row)) throw new TypeError('Invalid public event');
    const id = requiredString(row.id, 'event ID'); const seq = boundedInteger(row.seq, 'event sequence');
    if (cutoff !== null && seq > cutoff) throw new Error('Evidence event is beyond the captured cutoff');
    if (eventIds.has(id)) throw new Error('Duplicate public event ID'); eventIds.add(id);
  }
  for (const row of userRows) {
    if (!isPlainObject(row)) throw new TypeError('Invalid public user evidence');
    const id = requiredString(row.id, 'user evidence ID'); const seq = boundedInteger(row.seq, 'user evidence sequence');
    if (cutoff !== null && seq > cutoff) throw new Error('User evidence is beyond the captured cutoff');
    if (userIds.has(id)) throw new Error('Duplicate public user evidence ID'); userIds.add(id);
  }
  // Only fields accepted by the public assessment contract are retained. This
  // deliberately excludes hidden reasoning and any future transport metadata.
  const allowed = ['instruction', 'sourceProtocol', 'referenceCatalog', 'taskId', 'inputVersion', 'intentVersion', 'intentReady', 'intentStatus', 'currentConversation', 'dialogueContext', 'goalHierarchy', 'requirements', 'inferences', 'implementationUnknowns', 'observerUnderstanding', 'userEvidence', 'userHistory', 'events', 'coverage', 'epochSeq', 'history', 'scope', 'throughSeq'];
  const sanitized = {};
  for (const key of allowed) if (Object.hasOwn(snapshot, key)) sanitized[key] = publicValue(snapshot[key]);
  if (Buffer.byteLength(canonical(sanitized)) > MAX_CAPTURE_BYTES) throw new Error('Public evidence snapshot exceeds capture limit');
  return { evidence: sanitized, eventIds, userIds, cutoff };
}
function sanitizeReport(report, known) {
  if (!isPlainObject(report) || typeof report.status !== 'string' || !report.status) throw new TypeError('Invalid report');
  const sanitized = publicValue(report);
  const refs = evidenceRefs(sanitized);
  for (const id of refs.events) if (!known.eventIds.has(id)) throw new Error('Report evidence is not present in the captured cutoff');
  for (const id of refs.users) if (!known.userIds.has(id)) throw new Error('Report user evidence is not present in the captured cutoff');
  return sanitized;
}
function frozenContentHash(evidence) {
  const { taskId: _taskId, ...content } = evidence;
  return sha256(content);
}
function modelInput(record) { return clone({ frozenInput: record.evidence, frozenInputHash: record.evidenceHash }); }

export class CandidateRegistry {
  constructor(ledger) {
    if (!ledger?.db || typeof ledger.snapshot !== 'function') throw new TypeError('CandidateRegistry requires a live Ledger');
    this.ledger = ledger;
    ledger.db.exec(`
      CREATE TABLE IF NOT EXISTS validation_candidates(
        id TEXT PRIMARY KEY, task TEXT NOT NULL REFERENCES tasks(id), revision TEXT NOT NULL,
        report_id TEXT NOT NULL, fingerprint TEXT NOT NULL, evidence_hash TEXT NOT NULL,
        report_hash TEXT NOT NULL, content_hash TEXT, body TEXT NOT NULL, created TEXT NOT NULL,
        UNIQUE(task,revision,report_id,fingerprint));
      CREATE TABLE IF NOT EXISTS validation_selections(
        candidate TEXT PRIMARY KEY REFERENCES validation_candidates(id), split TEXT NOT NULL,
        reviewer TEXT NOT NULL, note TEXT, kind TEXT NOT NULL, selected TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS validation_feedback(
        id TEXT PRIMARY KEY, candidate TEXT NOT NULL REFERENCES validation_candidates(id), reviewer TEXT NOT NULL,
        verdict TEXT NOT NULL, note TEXT, body TEXT NOT NULL, created TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS validation_candidates_task ON validation_candidates(task,created);
      CREATE INDEX IF NOT EXISTS validation_feedback_candidate ON validation_feedback(candidate,created);`);
    // Older local registries may predate the content de-duplication fence.
    try { ledger.db.exec('ALTER TABLE validation_candidates ADD COLUMN content_hash TEXT'); }
    catch (error) { if (!/duplicate column name/i.test(error.message)) throw error; }
    ledger.db.exec('CREATE INDEX IF NOT EXISTS validation_candidates_content_hash ON validation_candidates(content_hash);');
  }
  capture(taskId, revision, report, evidenceSnapshot) {
    requiredString(taskId, 'task ID'); requiredString(revision, 'revision');
    // snapshot() is the binding authority; no caller-supplied task/session pair
    // can manufacture a cross-task capture.
    this.ledger.snapshot(taskId);
    const validated = sanitizeEvidence(taskId, evidenceSnapshot);
    const cleanReport = sanitizeReport(report, validated);
    const evidenceHash = sha256(validated.evidence), reportHash = sha256(cleanReport), contentHash = frozenContentHash(validated.evidence);
    const reportId = typeof cleanReport.id === 'string' && cleanReport.id ? cleanReport.id : reportHash;
    const fingerprint = sha256({ evidenceHash, reportHash });
    return this.ledger.transaction(() => {
      const existing = this.ledger.db.prepare('SELECT * FROM validation_candidates WHERE task=? AND revision=? AND report_id=? AND fingerprint=?').get(taskId, revision, reportId, fingerprint);
      if (existing) return this.#row(existing);
      const item = { id: randomUUID(), taskId, revision, report: cleanReport, evidence: validated.evidence, evidenceHash, reportHash, contentHash, provenance: 'local-captured-public-assessment', created: new Date().toISOString() };
      this.ledger.db.prepare('INSERT INTO validation_candidates(id,task,revision,report_id,fingerprint,evidence_hash,report_hash,content_hash,body,created) VALUES (?,?,?,?,?,?,?,?,?,?)').run(item.id, taskId, revision, reportId, fingerprint, evidenceHash, reportHash, contentHash, canonical(item), item.created);
      return { ...clone(item), modelInput: modelInput(item), selection: null };
    });
  }
  list(taskId = null) {
    if (taskId !== null) { requiredString(taskId, 'task ID'); this.ledger.snapshot(taskId); }
    const rows = taskId === null ? this.ledger.db.prepare('SELECT * FROM validation_candidates ORDER BY rowid').all() : this.ledger.db.prepare('SELECT * FROM validation_candidates WHERE task=? ORDER BY rowid').all(taskId);
    return rows.map(row => this.#row(row));
  }
  select(candidateId, { split, reviewer, note = null, kind } = {}) {
    requiredString(candidateId, 'candidate ID');
    if (!['development', 'holdout'].includes(split)) throw new TypeError('Invalid selection split');
    if (!['real', 'synthetic'].includes(kind)) throw new TypeError('Invalid candidate kind');
    if (kind === 'synthetic' && split === 'holdout') throw new Error('Synthetic candidates cannot enter holdout');
    requiredString(reviewer, 'reviewer'); if (note !== null) requiredString(note, 'selection note');
    return this.ledger.transaction(() => {
      const row = this.ledger.db.prepare('SELECT * FROM validation_candidates WHERE id=?').get(candidateId);
      if (!row) throw new Error('Unknown candidate');
      const item = this.#record(row);
      const existing = this.ledger.db.prepare('SELECT * FROM validation_selections WHERE candidate=?').get(candidateId);
      if (existing) {
        if (existing.split !== split || existing.reviewer !== reviewer || existing.note !== note || existing.kind !== kind) throw new Error('Candidate selection is immutable');
        return this.#row(row, existing);
      }
      const contamination = this.ledger.db.prepare(`SELECT c.id FROM validation_candidates c JOIN validation_selections s ON s.candidate=c.id
        WHERE (c.task=? OR (c.content_hash IS NOT NULL AND c.content_hash=?)) AND s.split<>? LIMIT 1`).get(row.task, item.contentHash, split);
      if (contamination) throw new Error('A main task or frozen public content cannot enter both splits');
      const selection = { split, reviewer, note, kind, selected: new Date().toISOString() };
      this.ledger.db.prepare('INSERT INTO validation_selections VALUES (?,?,?,?,?,?)').run(candidateId, split, reviewer, note, kind, selection.selected);
      return this.#row(row, selection);
    });
  }
  recordFeedback(candidateId, { reviewer, verdict, note = null, ...rest } = {}) {
    requiredString(candidateId, 'candidate ID'); requiredString(reviewer, 'reviewer'); requiredString(verdict, 'feedback verdict'); if (note !== null) requiredString(note, 'feedback note');
    return this.ledger.transaction(() => {
      if (!this.ledger.db.prepare('SELECT id FROM validation_candidates WHERE id=?').get(candidateId)) throw new Error('Unknown candidate');
      const item = { id: randomUUID(), candidateId, reviewer, verdict, note, details: publicValue(rest), created: new Date().toISOString() };
      this.ledger.db.prepare('INSERT INTO validation_feedback VALUES (?,?,?,?,?,?,?)').run(item.id, candidateId, reviewer, verdict, note, canonical(item), item.created);
      return clone(item);
    });
  }
  exportSelected({ split = null } = {}) {
    if (split !== null && !['development', 'holdout'].includes(split)) throw new TypeError('Invalid selection split');
    const rows = split === null ? this.ledger.db.prepare('SELECT c.* FROM validation_candidates c JOIN validation_selections s ON s.candidate=c.id ORDER BY c.rowid').all() : this.ledger.db.prepare('SELECT c.* FROM validation_candidates c JOIN validation_selections s ON s.candidate=c.id WHERE s.split=? ORDER BY c.rowid').all(split);
    return rows.map(row => modelInput(this.#record(row)));
  }
  metrics() {
    const records=this.ledger.db.prepare('SELECT * FROM validation_candidates ORDER BY rowid').all().map(row=>this.#record(row));
    const captured = this.ledger.db.prepare('SELECT COUNT(*) AS count,COUNT(DISTINCT task) AS tasks FROM validation_candidates').get();
    const selected = { real: {}, synthetic: {} };
    for (const kind of ['real', 'synthetic']) for (const split of ['development', 'holdout']) {
      const row = this.ledger.db.prepare('SELECT COUNT(*) AS candidates,COUNT(DISTINCT c.task) AS tasks FROM validation_candidates c JOIN validation_selections s ON s.candidate=c.id WHERE s.kind=? AND s.split=?').get(kind, split);
      selected[kind][split] = { candidates: row.candidates, mainTasks: row.tasks };
    }
    const groups={failed:[],timeout:[],noReport:[],reported:[],incomplete:[]},statuses={};
    for(const record of records){
      const status=record.report.status;statuses[status]=(statuses[status]??0)+1;
      const group=status==='timeout'?'timeout':['failed','invalid-output','input-too-large','publication-failed'].includes(status)?'failed':status==='assessed-incomplete'?'incomplete':['assessed','assessed-partial'].includes(status)&&Array.isArray(record.report.result?.findings)?'reported':'noReport';
      groups[group].push(record);
    }
    const outcomes=Object.fromEntries(Object.entries(groups).map(([key,rows])=>[key,{candidates:rows.length,mainTasks:new Set(rows.map(row=>row.taskId)).size}]));
    const feedback = this.ledger.db.prepare('SELECT COUNT(*) AS count FROM validation_feedback').get();
    return { capturedCandidates: captured.count, capturedMainTasks: captured.tasks, selected, outcomes, statuses, feedbackRecords: feedback.count };
  }
  #row(row, selection = undefined) {
    const item = this.#record(row);
    const selected = selection === undefined ? this.ledger.db.prepare('SELECT * FROM validation_selections WHERE candidate=?').get(row.id) : selection;
    return { ...clone(item), modelInput: modelInput(item), selection: selected ? { split: selected.split, reviewer: selected.reviewer, note: selected.note, kind: selected.kind, selected: selected.selected } : null };
  }
  #record(row) {
    let item;
    try { item = JSON.parse(row.body); } catch { throw new Error('Corrupt candidate record'); }
    try {
      if (!isPlainObject(item) || !isPlainObject(item.evidence) || !isPlainObject(item.report) || item.id !== row.id || item.taskId !== row.task || item.revision !== row.revision ||
        item.evidenceHash !== row.evidence_hash || item.reportHash !== row.report_hash ||
        sha256(item.evidence) !== row.evidence_hash || sha256(item.report) !== row.report_hash ||
        item.contentHash !== frozenContentHash(item.evidence) || (row.content_hash !== null && row.content_hash !== item.contentHash)) throw new Error('Corrupt candidate record');
    } catch { throw new Error('Corrupt candidate record'); }
    return item;
  }
}
