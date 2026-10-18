'use strict';

// Metrics are LOCAL synthetic operations, not WakaTime server statistics.
const PATTERNS = Object.freeze({
  balanced: Object.freeze({ id: 'balanced', label: 'Seimbang 1:1', description: 'Menambahkan 4 baris dan menghapus maksimal 4 baris sebelumnya', additions: 4, deletions: 4 }),
  more: Object.freeze({ id: 'more', label: 'Penambahan dominan 4:1', description: 'Menambahkan 4 baris dan menghapus maksimal 1 baris sebelumnya', additions: 4, deletions: 1 }),
  heavy: Object.freeze({ id: 'heavy', label: 'Pertumbuhan tinggi 8:1', description: 'Menambahkan 8 baris dan menghapus maksimal 1 baris sebelumnya', additions: 8, deletions: 1 })
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
