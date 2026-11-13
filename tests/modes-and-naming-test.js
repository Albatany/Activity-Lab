'use strict';
const assert = require('node:assert/strict');
const catalog = require('../languages.json');
const { MODES, resolveModes } = require('../modes');
const { STEMS, GENERIC, buildFileName } = require('../fileNaming');
const modes = resolveModes(MODES, catalog);
assert(modes.length >= 30, 'At least 30 profession modes');
assert.equal(new Set(modes.map(m => m.title)).size, modes.length);
for (const mode of modes) assert(mode.profiles.length >= 5, `${mode.title} should include multiple profiles`);
for (const name of ['Data Analyst', 'AI Engineer', 'Cyber Security Analyst', 'Full Stack Developer', 'DevSecOps Engineer']) {
  assert(modes.some(mode => mode.title === name), name);
}
const allStems = [...Object.values(STEMS).flat(), ...GENERIC];
assert(allStems.every(stem => !/log/i.test(stem)), 'Generated scratch filename stems must not contain the log substring');
const names = new Set();
const language = catalog.find(l => l.label === 'Python');
for (let i = 0; i < 150; i++) {
  const name = buildFileName(language, names);
  assert(name.endsWith('.py'));
  assert(!name.startsWith('demo_') || names.size > 0);
}
assert.equal(names.size, 150);
console.log(`PASS: ${modes.length} curated modes, distinct randomized names, randomized scratch filenames.`);
