export function truncateUtf8(value, maxBytes) {
  if (typeof value !== 'string') return {text: '', truncated: false};
  if (Buffer.byteLength(value) <= maxBytes) return {text: value, truncated: false};
  let text = '', used = 0;
  for (const character of value) {
    const bytes = Buffer.byteLength(character);
    if (used + bytes > maxBytes) break;
    text += character;
    used += bytes;
  }
  return {text, truncated: true};
}

function stringsFor(type) {
  if (type === 'tool/call') return ['arguments'];
  if (type === 'tool/result' || type === 'assistant/message') return ['text'];
  return [];
}

// Limits are transport bytes: newlines, quotes and backslashes expand in JSON.
function truncateJsonString(value, maxBytes) {
  if (Buffer.byteLength(JSON.stringify(value)) - 2 <= maxBytes) return {text:value,truncated:false};
  let text = '', used = 0;
  for (const character of value) {
    const bytes = Buffer.byteLength(JSON.stringify(character)) - 2;
    if (used + bytes > maxBytes) break;
    text += character;
    used += bytes;
  }
  return {text,truncated:true};
}

/** Makes a bounded model/read view while retaining the proof-bearing fields. */
export function excerptData(type, original, maxBytes = 1200) {
  const data = structuredClone(original);
  let truncated = data.truncated === true;
  const payloads = stringsFor(type);
  for (const key of payloads) {
    if (typeof data[key] !== 'string') continue;
    // Leave room for structural keys, identity and the truncated marker.
    const allowance = Math.max(0, maxBytes - Buffer.byteLength(JSON.stringify({...data, [key]: '', truncated: true})));
    const clipped = truncateJsonString(data[key], allowance);
    data[key] = clipped.text;
    truncated ||= clipped.truncated;
  }
  // A malformed-but-public identifier must not bypass the hard transport cap.
  // Keep its field (so callers can see the limitation) but shorten its value
  // on a UTF-8 boundary and let the store record an oversized-event gap.
  for (const key of Object.keys(data)) {
    if (Buffer.byteLength(JSON.stringify(data)) <= maxBytes) break;
    if (key === 'fact' || typeof data[key] !== 'string') continue;
    const allowance = Math.max(0, maxBytes - Buffer.byteLength(JSON.stringify({...data, [key]: '', truncated: true})));
    const clipped = truncateJsonString(data[key],allowance);
    data[key] = clipped.text;
    truncated ||= clipped.truncated;
  }
  if (truncated) data.truncated = true;
  return data;
}

export function eventView(row, maxBytes = 1200) {
  const overhead = Buffer.byteLength(JSON.stringify({id:row.id,seq:row.seq,type:row.type,data:{}}));
  return {id:row.id, seq:row.seq, type:row.type, data:excerptData(row.type,row.data,Math.max(0,maxBytes-overhead))};
}

/**
 * Selects a compact recent window.  A tool result is admitted together with
 * its newest preceding request when both fit, so the model does not receive an
 * apparently unpaired result merely because the request is older.
 */
export function recentWindow(rows, limit = 80) {
  const sorted = [...rows].sort((a,b) => a.seq - b.seq);
  const calls = new Map();
  for (const row of sorted) if (row.type === 'tool/call' && typeof row.data?.callId === 'string') calls.set(row.data.callId, row);
  const selected = new Map();
  for (let index = sorted.length - 1; index >= 0; index--) {
    const row = sorted[index];
    const bundle = [row];
    if (row.type === 'tool/result' && typeof row.data?.callId === 'string') {
      const call = calls.get(row.data.callId);
      if (call && call.seq < row.seq && !selected.has(call.id)) bundle.push(call);
    }
    const fresh = bundle.filter(item => !selected.has(item.id));
    if (selected.size + fresh.length > limit) continue;
    for (const item of fresh) selected.set(item.id,item);
    if (selected.size === limit) break;
  }
  const included = [...selected.values()].sort((a,b) => a.seq - b.seq);
  const selectedIds = new Set(included.map(row => row.id));
  const omitted = sorted.filter(row => !selectedIds.has(row.id));
  // Keep the entire events array near 30KiB, not merely each individual row.
  // Sparse current windows can preserve useful public answers; dense windows
  // still divide the same total budget and retain their pairing behavior.
  const eventCap = included.length ? Math.min(8192, Math.floor(29900 / included.length)) : 8192;
  const events = included.map(row => eventView(row,eventCap));
  const truncatedEvents = events.filter(row => row.data.truncated).length;
  const omittedGapCount = omitted.filter(row => row.gap).length;
  const totalEvents = sorted.length;
  const omittedEvents = totalEvents - included.length;
  return {
    events,
    history: {
      mode: omittedEvents || truncatedEvents ? 'recent-window' : 'complete', totalEvents, includedEvents: included.length, omittedEvents,
      truncatedEvents, fromSeq: included[0]?.seq ?? null, throughSeq: sorted.at(-1)?.seq ?? null,
      omittedGapCount, partial: !!(omittedEvents || truncatedEvents),
    },
  };
}
