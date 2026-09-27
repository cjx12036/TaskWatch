function limit(value,name,fallback){if(value===null||value===undefined&&fallback===Infinity)return Infinity;return integer(value,name,fallback);}
function integer(value, name, fallback) {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 1) throw new TypeError(`${name} must be a positive integer`);
  return resolved;
}
function nonnegative(value, name, fallback) {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 0) throw new TypeError(`${name} must be a non-negative integer`);
  return resolved;
}
function initialUsage(value, config) {
  const input = value ?? {};
  if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).some(key => key !== 'requests' && key !== 'outputTokens')) throw new TypeError('Invalid initialUsage');
  const requests = nonnegative(input.requests, 'initialUsage.requests', 0);
  const outputTokens = nonnegative(input.outputTokens, 'initialUsage.outputTokens', 0);
  if (requests > config.maxRequests || outputTokens > config.maxOutputTokens) throw new RangeError('Initial usage exceeds budget');
  return {requests, outputTokens};
}
function refreshedConfig(current, options) {
  if (!options || Array.isArray(options) || typeof options !== 'object') throw new TypeError('Invalid observe configuration');
  const allowed = new Set(['maxRequests','maxOutputTokens','maxTokens','timeoutMs','debounceMs','ttlMs']);
  if (Object.keys(options).some(key => !allowed.has(key))) throw new TypeError('Invalid observe configuration field');
  const config = {
    maxRequests: limit(options.maxRequests, 'maxRequests', current.maxRequests),
    maxOutputTokens: limit(options.maxOutputTokens, 'maxOutputTokens', current.maxOutputTokens),
    maxTokens: integer(options.maxTokens, 'maxTokens', current.maxTokens),
    timeoutMs: integer(options.timeoutMs, 'timeoutMs', current.timeoutMs),
    debounceMs: nonnegative(options.debounceMs, 'debounceMs', current.debounceMs),
    ttlMs: integer(options.ttlMs, 'ttlMs', current.ttlMs),
  };
  if (config.maxTokens > 8192) throw new RangeError('maxTokens must not exceed 8192');
  if (config.timeoutMs > 180000) throw new RangeError('timeoutMs must not exceed 180000');
  return config;
}

function report(taskId, status, details = {}) {
  return Object.freeze({taskId, status, ...details});
}
function revision(value) { return typeof value === 'string' ? value : value?.revision ?? value?.token ?? null; }

/**
 * Schedules observation for explicitly enabled tasks.  It has no DSH imports:
 * callers provide a stable evidence revision through snapshot() and perform
 * extraction/assessment through run().
 */
export class ObserveController {
  constructor({snapshot, run, check, publish, onReserve, minIntervalMs = 0, autoRetryStale = true, now = Date.now, setTimeout: schedule = setTimeout, clearTimeout: cancel = clearTimeout}) {
    for (const [name, value] of Object.entries({snapshot, run, check, publish})) if (typeof value !== 'function') throw new TypeError(`${name} must be a function`);
    if (onReserve !== undefined && typeof onReserve !== 'function') throw new TypeError('onReserve must be a function');
    nonnegative(minIntervalMs,'minIntervalMs');
    this.deps = {snapshot, run, check, publish, onReserve, minIntervalMs, autoRetryStale, now, schedule, cancel};
    this.tasks = new Map();
    this.disposed = false;
  }

  start(taskId, options = {}) {
    if (this.disposed) throw new Error('ObserveController is disposed');
    if (typeof taskId !== 'string' || !taskId) throw new TypeError('taskId is required');
    if (this.tasks.has(taskId)) throw new Error(`Task ${taskId} already started; observation budgets cannot be reset`);
    const config = {
      maxRequests: limit(options.maxRequests, 'maxRequests'),
      maxOutputTokens: limit(options.maxOutputTokens, 'maxOutputTokens'),
      maxTokens: integer(options.maxTokens, 'maxTokens'),
      timeoutMs: integer(options.timeoutMs, 'timeoutMs', 180000),
      debounceMs: nonnegative(options.debounceMs, 'debounceMs', 250),
      ttlMs: integer(options.ttlMs, 'ttlMs', 390000),
    };
    if (config.maxTokens > 8192) throw new RangeError('maxTokens must not exceed 8192');
    if (config.timeoutMs > 180000) throw new RangeError('timeoutMs must not exceed 180000');
    const usage = initialUsage(options.initialUsage, config);
    const state = {taskId, config, dirty: options.initialDirty !== false, stopped: false, generation: 0, inflight: null, timer: null, lastStartedAt: null, requestsUsed: usage.requests, outputTokensUsed: usage.outputTokens, exhausted: usage.requests >= config.maxRequests || usage.outputTokens >= config.maxOutputTokens, reserveFailed: false, latestReport: null};
    this.tasks.set(taskId, state);
    if(state.dirty)this.#schedule(state);
    return this.status(taskId);
  }

  notify(taskId) {
    const state = this.tasks.get(taskId);
    if (!state || state.stopped || this.disposed) return false;
    state.dirty = true;
    if (state.dirty && !state.inflight) this.#schedule(state);
    return true;
  }

  stop(taskId) {
    const state = this.tasks.get(taskId);
    if (!state || state.stopped) return false;
    state.stopped = true;
    state.generation += 1;
    state.dirty = false;
    if (state.timer !== null) this.deps.cancel(state.timer);
    state.timer = null;
    return true;
  }

  resume(taskId, options) {
    const state = this.tasks.get(taskId);
    if (!state || !state.stopped || this.disposed) return false;
    if (options !== undefined) {
      const {initialDirty: _initialDirty, ...settings} = options;
      const next = refreshedConfig(state.config, settings);
      if (next.maxRequests < state.requestsUsed || next.maxOutputTokens < state.outputTokensUsed) throw new Error('Updated cap cannot be below used budget');
      state.config = next;
    }
    state.stopped = false;
    state.generation += 1;
    state.dirty = options?.initialDirty !== false;
    state.exhausted = false;
    state.reserveFailed = false;
    if (!state.inflight) this.#schedule(state);
    return this.status(taskId);
  }

  status(taskId) {
    const state = this.tasks.get(taskId);
    if (!state) return null;
    return Object.freeze({taskId, status: state.stopped ? 'paused' : state.exhausted ? 'budget-exhausted' : state.inflight ? 'observing' : 'active', requests: state.requestsUsed, requestsUsed: state.requestsUsed, requestsRemaining: state.config.maxRequests - state.requestsUsed, outputTokensUsed: state.outputTokensUsed, outputTokensRemaining: state.config.maxOutputTokens - state.outputTokensUsed, latestReport: state.latestReport});
  }

  async flush(taskId) {
    const state = this.tasks.get(taskId);
    if (!state) return null;
    if (this.deps.minIntervalMs && state.lastStartedAt !== null && this.deps.now()-state.lastStartedAt < this.deps.minIntervalMs) {
      while (state.inflight) await state.inflight;
      return this.status(taskId);
    }
    if (state.timer !== null) { this.deps.cancel(state.timer); state.timer = null; }
    if (!state.inflight && state.dirty && !state.stopped && !this.disposed) this.#drain(state);
    while (state.inflight) await state.inflight;
    return this.status(taskId);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const state of this.tasks.values()) this.stop(state.taskId);
  }

  #schedule(state) {
    if (state.timer !== null || state.inflight || state.stopped || this.disposed) return;
    const cooldown=state.lastStartedAt===null?0:Math.max(0,this.deps.minIntervalMs-(this.deps.now()-state.lastStartedAt));
    state.timer = this.deps.schedule(() => {
      state.timer = null;
      if (!state.inflight && state.dirty) this.#drain(state);
    }, Math.max(state.config.debounceMs,cooldown));
    state.timer?.unref?.();
  }

  #drain(state) {
    state.inflight = (async () => {
      while (state.dirty && !state.stopped && !this.disposed) {
        state.dirty = false;
        await this.#observe(state, state.generation);
        if(this.deps.minIntervalMs)break;
      }
    })().finally(() => {
      state.inflight = null;
      if (state.dirty && !state.stopped && !this.disposed) this.#schedule(state);
    });
    return state.inflight;
  }

  #active(state, generation) { return !this.disposed && !state.stopped && state.generation === generation; }

  async #observe(state, generation) {
    if (!this.#active(state, generation)) return;
    state.lastStartedAt=this.deps.now();
    const began = this.deps.now();
    let initial;
    try { initial = revision(this.deps.snapshot(state.taskId)); }
    catch { await this.#publish(state, report(state.taskId, 'failed', {reason: 'snapshot-unavailable', observedAt: this.deps.now()})); return; }
    let result;
    let revisionChanged = false, ttlExpired = false;
    const guardedCheck = async (options = {}) => {
      const requested = integer(options.maxTokens, 'check maxTokens', state.config.maxTokens);
      const tokens = Math.min(requested, state.config.maxTokens);
      if (!this.#active(state, generation)) return {status: 'disposed'};
      if (this.deps.now() - began > state.config.ttlMs) { ttlExpired = true; return {status: 'stale'}; }
      try {
        if (revision(this.deps.snapshot(state.taskId)) !== initial) { revisionChanged = true; return {status: 'stale'}; }
      } catch { revisionChanged = true; return {status: 'failed'}; }
      if (state.requestsUsed >= state.config.maxRequests || state.outputTokensUsed + tokens > state.config.maxOutputTokens) {
        state.exhausted = true;
        return {status: 'budget-exhausted'};
      }
      const reservation = {requests: 1, outputTokens: tokens};
      // Count synchronously before the first await.  Two parallel checks then
      // cannot both pass the same remaining-budget test.
      state.requestsUsed += 1;
      state.outputTokensUsed += tokens;
      try {
        if (this.deps.onReserve && (await this.deps.onReserve(state.taskId, reservation)) === false) {
          state.exhausted = true;
          return {status: 'budget-exhausted'};
        }
      } catch {
        state.reserveFailed = true;
        return {status: 'failed'};
      }
      // stop/dispose may happen while a durable reservation is being recorded.
      // The reservation is never turned into a provider request afterwards.
      if (!this.#active(state, generation)) return {status: 'disposed'};
      const requestedTimeout = integer(options.timeoutMs, 'check timeoutMs', state.config.timeoutMs);
      return this.deps.check({...options, maxTokens: tokens, timeoutMs: Math.min(requestedTimeout, state.config.timeoutMs, 180000)});
    };
    try { result = await this.deps.run(state.taskId, guardedCheck, () => this.#active(state, generation), () => { initial = revision(this.deps.snapshot(state.taskId)); }); }
    catch { result = {status: 'failed'}; }
    if (!this.#active(state, generation)) return;
    let current;
    try { current = revision(this.deps.snapshot(state.taskId)); }
    catch { await this.#publish(state, report(state.taskId, 'failed', {reason: 'snapshot-unavailable', observedAt: this.deps.now()})); return; }
    const elapsed = this.deps.now() - began;
    let next;
    if (ttlExpired || elapsed > state.config.ttlMs) next = report(state.taskId, 'stale', {reason: 'ttl-expired', observedAt: this.deps.now()});
    else if (revisionChanged || initial !== current) {
      next = report(state.taskId, 'stale', {reason: 'evidence-revision-changed', observedAt: this.deps.now()});
      // A changed revision merits one fresh pass.  Once a pass discovers that
      // no request can be reserved, it must not spin forever on the same data.
      if (!state.exhausted && this.deps.autoRetryStale) state.dirty = true;
    }
    else if (state.exhausted) next = report(state.taskId, 'budget-exhausted', {reason: state.reserveFailed ? 'reservation-unavailable' : 'budget-exhausted', observedAt: this.deps.now()});
    else next = report(state.taskId, result?.status ?? 'failed', {...(result && typeof result === 'object' ? result : {}), observedAt: this.deps.now()});
    await this.#publish(state, next);
  }

  async #publish(state, next) {
    state.latestReport = next;
    try { await this.deps.publish(state.taskId, next); }
    catch { state.latestReport = report(state.taskId, 'publication-failed', {reason: 'publication-failed', observedAt: this.deps.now()}); }
  }
}
