const fields = ['provider','model','maxRequests','maxOutputTokens','maxTokens','timeoutMs','debounceMs','ttlMs','enabled'];

function positive(value, name, maximum = Infinity) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new TypeError(`Invalid ${name}`);
  return value;
}
function nonnegative(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`Invalid ${name}`);
  return value;
}
function validate(config) {
  if (!config || Array.isArray(config) || typeof config !== 'object' || Object.keys(config).length !== fields.length || fields.some(key => !(key in config))) throw new TypeError('Invalid approved budget config');
  for (const key of ['provider','model']) if (typeof config[key] !== 'string' || !config[key].trim() || config[key].length > 512) throw new TypeError(`Invalid ${key}`);
  if(config.maxRequests!==null)positive(config.maxRequests, 'maxRequests');
  if(config.maxOutputTokens!==null)positive(config.maxOutputTokens, 'maxOutputTokens');
  positive(config.maxTokens, 'maxTokens', 8192);
  positive(config.timeoutMs, 'timeoutMs', 180000);
  nonnegative(config.debounceMs, 'debounceMs');
  positive(config.ttlMs, 'ttlMs');
  if (typeof config.enabled !== 'boolean') throw new TypeError('Invalid enabled');
  return structuredClone(config);
}

/** Persistent, global model-call allowance shared by observe and sidebar chat. */
export class BudgetStore {
  constructor(ledger) {
    if (!ledger?.db || typeof ledger.transaction !== 'function') throw new TypeError('BudgetStore requires a live Ledger');
    this.ledger = ledger;
    ledger.db.exec(`CREATE TABLE IF NOT EXISTS observe_budget(
      id INTEGER PRIMARY KEY CHECK(id=1), config TEXT NOT NULL,
      requests_used INTEGER NOT NULL, output_tokens_used INTEGER NOT NULL, updated TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS observe_pauses(
      task TEXT PRIMARY KEY REFERENCES tasks(id), paused INTEGER NOT NULL, updated TEXT NOT NULL
    );`);
  }

  approve(config) {
    const next = validate(config);
    return this.ledger.transaction(() => {
      const row = this.#row();
      const requestsUsed = row?.requests_used ?? 0;
      const outputTokensUsed = row?.output_tokens_used ?? 0;
      if ((next.maxRequests!==null&&next.maxRequests < requestsUsed) || (next.maxOutputTokens!==null&&next.maxOutputTokens < outputTokensUsed)) throw new Error('Approved cap cannot be below used budget');
      const now = new Date().toISOString();
      if (row) this.ledger.db.prepare('UPDATE observe_budget SET config=?,updated=? WHERE id=1').run(JSON.stringify(next), now);
      else this.ledger.db.prepare('INSERT INTO observe_budget VALUES (1,?,?,?,?)').run(JSON.stringify(next),0,0,now);
      return this.info();
    });
  }

  info() {
    const row = this.#row();
    if (!row) return Object.freeze({configured:false});
    const config = JSON.parse(row.config);
    return Object.freeze({configured:true, config, requestsUsed:row.requests_used, outputTokensUsed:row.output_tokens_used,
      requestsRemaining:config.maxRequests===null?null:Math.max(0,config.maxRequests-row.requests_used), outputTokensRemaining:config.maxOutputTokens===null?null:Math.max(0,config.maxOutputTokens-row.output_tokens_used)});
  }

  reserve(tokens) {
    positive(tokens, 'tokens', 8192);
    return this.ledger.transaction(() => {
      const row = this.#row();
      if (!row) return false;
      const config = JSON.parse(row.config);
      if (!config.enabled || tokens > config.maxTokens || (config.maxRequests!==null&&row.requests_used >= config.maxRequests) || (config.maxOutputTokens!==null&&row.output_tokens_used + tokens > config.maxOutputTokens)) return false;
      this.ledger.db.prepare('UPDATE observe_budget SET requests_used=requests_used+1,output_tokens_used=output_tokens_used+?,updated=? WHERE id=1').run(tokens,new Date().toISOString());
      return true;
    });
  }

  setPaused(taskId, paused) {
    if (typeof taskId !== 'string' || !taskId || typeof paused !== 'boolean') throw new TypeError('Invalid pause state');
    return this.ledger.transaction(() => {
      // The FK makes pauses scoped to an explicitly bound task.
      this.ledger.db.prepare('INSERT INTO observe_pauses VALUES (?,?,?) ON CONFLICT(task) DO UPDATE SET paused=excluded.paused,updated=excluded.updated').run(taskId,Number(paused),new Date().toISOString());
      return paused;
    });
  }

  isPaused(taskId) {
    if (typeof taskId !== 'string' || !taskId) throw new TypeError('Invalid taskId');
    return !!this.ledger.db.prepare('SELECT paused FROM observe_pauses WHERE task=?').get(taskId)?.paused;
  }

  #row() { return this.ledger.db.prepare('SELECT config,requests_used,output_tokens_used FROM observe_budget WHERE id=1').get(); }
}
