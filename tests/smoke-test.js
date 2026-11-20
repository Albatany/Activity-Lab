'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pkg = require('../package.json');
const languages = require('../languages.json');
const src = fs.readFileSync(path.join(__dirname, '..', 'extension.js'), 'utf8');
assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
assert(fs.existsSync(path.join(__dirname, '..', pkg.icon)));
assert(pkg.contributes.commands.some(c => c.command === 'activityLab.start'));
assert(pkg.contributes.commands.some(c => c.command === 'activityLab.stop'));
assert(languages.length >= 130);
for (const name of ['Assembly (x86/NASM)','SQL','Bash','Markdown','TypeScript (React TSX)','Python','Dockerfile','Terraform']) {
  if (name === 'Terraform') assert(languages.some(l => l.label === 'HCL / Terraform'));
  else assert(languages.some(l => l.label === name), name);
}
assert(src.includes('Until stopped'));
assert(src.includes('synthetic_additions'));
assert(src.includes('synthetic_deletions'));
assert(src.includes('pickPattern'));
assert(src.includes('wakatime_verified: false'));
assert(src.includes('minutes: 480'));
assert(src.includes('program_languages'));
assert(!src.includes('api_key='));
console.log(`PASS: package/source validation (${languages.length} offline profiles).`);

const { recordFor, recordSize, isJson } = require('../snippets');
const { Script } = require('node:vm');
const originalRandom = Math.random;
try {
  for (const language of languages) {
    const variants = [];
    for (const fraction of [0, 0.45, 0.96]) {
      Math.random = () => fraction;
      const record = recordFor(language, 7);
      variants.push(JSON.stringify(record));
      if (isJson(language)) assert.equal(typeof record.label, 'string');
      else {
        assert(!record.startsWith('# ') || !record.includes(' sample 7 ('), language.label);
        if (language.id === 'javascript') new Script(record);
      }
      for (const budget of [1, 2, 3, 4, 8]) {
        const rows = recordSize(language, recordFor(language, 7, budget));
        assert(rows >= 1 && rows <= budget, language.label);
      }
    }
    assert(new Set(variants).size > 1, language.label);
  }
} finally {
  Math.random = originalRandom;
}
console.log('PASS: native sample variants and edit budgets for every built-in profile.');
