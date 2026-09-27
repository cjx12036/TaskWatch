const stages = new Set(['before-agent-ready','after-agent-ready-before-request-boundary',
  'after-request-boundary-before-public-text','after-public-text','after-stream-finish-before-idle']);
const offsets = ['agentReadyMs','requestBoundaryMs','firstPublicTextChunkMs','streamFinishMs','idleMs','cleanupMs','totalMs'];

// Keep journal diagnostics structural: never persist model/provider text or errors.
export function safeCheckDiagnostics(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null;
  const expected = new Set(['timeoutMs',...offsets,'timeoutStage','counts']);
  if (Object.keys(value).some(key => !expected.has(key)) || !Number.isSafeInteger(value.timeoutMs) || value.timeoutMs < 1 || value.timeoutMs > 180000) return null;
  for (const key of offsets) if (value[key] !== null && (!Number.isSafeInteger(value[key]) || value[key] < 0 || value[key] > 604800000)) return null;
  if (value.timeoutStage !== null && !stages.has(value.timeoutStage)) return null;
  if (!value.counts || Array.isArray(value.counts) || typeof value.counts !== 'object' || Object.keys(value.counts).length !== 1 || !Number.isSafeInteger(value.counts.publicTextChunks) || value.counts.publicTextChunks < 0 || value.counts.publicTextChunks > 1000000) return null;
  return {timeoutMs:value.timeoutMs,...Object.fromEntries(offsets.map(key=>[key,value[key]])),timeoutStage:value.timeoutStage,counts:{publicTextChunks:value.counts.publicTextChunks}};
}
