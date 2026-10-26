'use strict';

// Metrics are LOCAL synthetic operations, not WakaTime server statistics.
const PATTERNS = Object.freeze({
  balanced: Object.freeze({ id: 'balanced', label: 'Balanced 1:1', description: 'Add four lines and remove up to four earlier lines', additions: 4, deletions: 4 }),
  more: Object.freeze({ id: 'more', label: 'Additions favored 4:1', description: 'Add four lines and remove up to one earlier line', additions: 4, deletions: 1 }),
  heavy: Object.freeze({ id: 'heavy', label: 'High growth 8:1', description: 'Add eight lines and remove up to one earlier line', additions: 8, deletions: 1 })
});
function buildPlan(pattern, availableLines) {
  if (!pattern || !Number.isInteger(pattern.additions) || !Number.isInteger(pattern.deletions) ||
      pattern.additions < 1 || pattern.deletions < 0 ||
      !Number.isSafeInteger(availableLines) || availableLines < 0) {
    throw new TypeError('Invalid synthetic additions/deletions plan');
  }
  return { add: pattern.additions, remove: Math.min(availableLines, pattern.deletions) };
}
module.exports = { PATTERNS, buildPlan };
