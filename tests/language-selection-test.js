'use strict';
const assert = require('node:assert/strict');
const catalog = require('../languages.json');
const {
  MAX_SELECTED_LANGUAGES, normalizeProfiles, validatePresetName,
  readPresets, savePreset, deletePreset, buildQuickPickItems
} = require('../languageSelection');

const selection = normalizeProfiles(['Python', 'SQL', 'Bash', 'Markdown', 'Python'], catalog);
assert.deepEqual(selection.map(item => item.label), ['Python', 'SQL', 'Bash', 'Markdown']);
assert.throws(() => normalizeProfiles([], catalog), /at least one/);
assert.throws(() => normalizeProfiles(['Missing Language'], catalog), /at least one/);
assert.throws(() => normalizeProfiles(catalog.slice(0, MAX_SELECTED_LANGUAGES + 1), catalog), /up to/);
assert.equal(validatePresetName('My Language Mix'), null);
assert(validatePresetName('../private'));
const items = buildQuickPickItems(catalog, ['SQL', 'Python']);
assert.equal(items.length, catalog.length);
assert.equal(items.filter(item => item.picked).length, 2);
assert(items.some(item => item.label === 'Assembly (x86/NASM)'));

const memory = new Map();
const state = {
  get: (key, fallback) => memory.has(key) ? memory.get(key) : fallback,
  async update(key, value) { memory.set(key, value); }
};
(async () => {
  await savePreset(state, catalog, 'My Data Stack', selection);
  assert.equal(readPresets(state, catalog)[0].languages.length, 4);
  await savePreset(state, catalog, 'My Data Stack', ['Rust', 'Go']);
  assert.deepEqual(readPresets(state, catalog)[0].languages, ['Rust', 'Go']);
  await savePreset(state, catalog, 'Web + API', ['HTML', 'CSS', 'JavaScript']);
  assert.equal(readPresets(state, catalog).length, 2);
  await deletePreset(state, catalog, 'My Data Stack');
  assert.equal(readPresets(state, catalog).length, 1);
  assert.equal(readPresets(state, catalog)[0].name, 'Web + API');
  console.log(`PASS: ${catalog.length} searchable profiles, multi-select validation, preset save, update, and deletion.`);
})().catch(e => { console.error(e); process.exitCode = 1; });
