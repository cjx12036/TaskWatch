const metric = value => Number.isSafeInteger(value) && value >= 0 ? value : null;

/** Provider-reported usage for TaskWatch checks only. No prompt or model output is stored. */
export class SupervisorUsage {
  constructor(ledger) {
    if (!ledger?.db) throw new TypeError('SupervisorUsage requires a Ledger');
    this.db = ledger.db;
    this.db.exec(`CREATE TABLE IF NOT EXISTS supervisor_usage(
      task TEXT NOT NULL, check_id TEXT NOT NULL, category TEXT NOT NULL, status TEXT NOT NULL,
      requests INTEGER NOT NULL, input_tokens INTEGER, output_tokens INTEGER,
      cache_read_tokens INTEGER, cache_write_tokens INTEGER,
      total_ms INTEGER, first_token_ms INTEGER, tokens_per_second REAL,
      created TEXT NOT NULL, PRIMARY KEY(task,check_id)
    )`);
  }

  record(task, checkId, category, result) {
    if (typeof task !== 'string' || !task || typeof checkId !== 'string' || !checkId
      || !['intent', 'assessment', 'chat', 'clarification'].includes(category)) throw new TypeError('Invalid usage identity');
    const diagnostics = result?.diagnostics ?? {};
    const usage = diagnostics.usage;
    const measured = metric(usage?.inputTokens) !== null && metric(usage?.outputTokens) !== null;
    this.db.prepare(`INSERT OR IGNORE INTO supervisor_usage VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      task, checkId, category, typeof result?.status === 'string' ? result.status : 'failed',
      diagnostics.requests === 1 ? 1 : 0,
      measured ? usage.inputTokens : null, measured ? usage.outputTokens : null,
      measured ? metric(usage.cacheReadTokens) : null, measured ? metric(usage.cacheWriteTokens) : null,
      metric(diagnostics.totalMs), metric(diagnostics.firstPublicTextChunkMs) !== null && metric(diagnostics.requestBoundaryMs) !== null
        ? Math.max(0, diagnostics.firstPublicTextChunkMs - diagnostics.requestBoundaryMs) : null,
      typeof diagnostics.tokensPerSecond === 'number' && Number.isFinite(diagnostics.tokensPerSecond) && diagnostics.tokensPerSecond >= 0 ? diagnostics.tokensPerSecond : null,
      new Date().toISOString(),
    );
  }

  summary(task = null) {
    const rows = task === null
      ? this.db.prepare('SELECT * FROM supervisor_usage ORDER BY created, rowid').all()
      : this.db.prepare('SELECT * FROM supervisor_usage WHERE task=? ORDER BY created, rowid').all(task);
    const result = { calls: 0, measuredCalls: 0, unknownCalls: 0, inputTokens: 0, outputTokens: 0,
      cacheReadTokens: 0, cacheWriteTokens: 0, cacheHitPercent: null, last: null };
    let cacheKnownCalls = 0;
    for (const row of rows) {
      result.calls += row.requests;
      if (row.requests && row.input_tokens !== null && row.output_tokens !== null) result.measuredCalls++;
      if (row.requests && row.input_tokens !== null && (row.cache_read_tokens !== null || row.cache_write_tokens !== null)) cacheKnownCalls++;
      result.inputTokens += row.input_tokens ?? 0;
      result.outputTokens += row.output_tokens ?? 0;
      result.cacheReadTokens += row.cache_read_tokens ?? 0;
      result.cacheWriteTokens += row.cache_write_tokens ?? 0;
      result.last = { category: row.category, status: row.status, totalMs: row.total_ms,
        firstTokenMs: row.first_token_ms, tokensPerSecond: row.tokens_per_second };
    }
    result.unknownCalls = result.calls - result.measuredCalls;
    const totalInput = result.inputTokens + result.cacheReadTokens + result.cacheWriteTokens;
    if (result.measuredCalls && cacheKnownCalls === result.measuredCalls && totalInput > 0) result.cacheHitPercent = result.cacheReadTokens / totalInput * 100;
    return result;
  }

  details(task, limit = 8) {
    if (typeof task !== 'string' || !task || !Number.isSafeInteger(limit) || limit < 1 || limit > 20) throw new TypeError('Invalid usage details request');
    return this.db.prepare('SELECT * FROM supervisor_usage WHERE task=? ORDER BY rowid DESC LIMIT ?').all(task,limit).map(row=>({
      checkId:row.check_id, category:row.category, status:row.status, requests:row.requests,
      inputTokens:row.input_tokens, outputTokens:row.output_tokens,
      cacheReadTokens:row.cache_read_tokens, cacheWriteTokens:row.cache_write_tokens,
      totalMs:row.total_ms, firstTokenMs:row.first_token_ms, tokensPerSecond:row.tokens_per_second, created:row.created,
    }));
  }
}
