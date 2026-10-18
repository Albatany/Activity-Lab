'use strict';
const assert = require('node:assert/strict');
const catalog = require('../languages.json');
const { MODES, resolveModes } = require('../modes');
const { buildFileName, validateProjectName } = require('../fileNaming');
const modes = resolveModes(MODES, catalog);
assert(modes.length >= 30, 'At least 30 profession modes');
assert.equal(new Set(modes.map(m => m.title)).size, modes.length);
for (const mode of modes) assert(mode.profiles.length >= 5, `${mode.title} should include multiple profiles`);
for (const name of ['Data Analyst', 'AI Engineer', 'Cyber Security Analyst', 'Full Stack Developer', 'DevSecOps Engineer']) {
  assert(modes.some(mode => mode.title === name), name);
}
const names = new Set();
const language = catalog.find(l => l.label === 'Python');
for (let i = 0; i < 150; i++) {
  const name = buildFileName(language, names);
  assert(name.endsWith('.py'));
  assert(!name.startsWith('demo_') || names.size > 0);
}
assert.equal(names.size, 150);
assert.equal(validateProjectName('Riset Analitik 2026'), null);
assert.equal(validateProjectName('Nama Proyek AI'), null);
assert(validateProjectName('bad\ninjection'));
assert(validateProjectName('../private'));
assert(validateProjectName('A'.repeat(70)));
console.log(`PASS: ${modes.length} curated modes, distinct randomized names, safe custom project names.`);
