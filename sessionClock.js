'use strict';

const { performance } = require('node:perf_hooks');

// A backward wall-clock adjustment must not extend a scheduled session.
// A forward jump (including sleep) expires the session without replaying edits.
function createSessionClock(minutes, wallNow = Date.now, monotonicNow = () => performance.now()) {
  const startedAt = wallNow();
  const startedMonotonic = monotonicNow();
  const durationMs = minutes === null ? null : minutes * 60_000;
  let elapsed = 0;
  return {
    startedAt,
    endsAt: durationMs === null ? null : startedAt + durationMs,
    elapsedMs() {
      elapsed = Math.max(elapsed, wallNow() - startedAt, monotonicNow() - startedMonotonic, 0);
      return elapsed;
    },
    remainingMs() { return durationMs === null ? null : Math.max(0, durationMs - this.elapsedMs()); },
    expired() { return durationMs !== null && this.elapsedMs() >= durationMs; }
  };
}

module.exports = { createSessionClock };
