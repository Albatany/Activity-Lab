'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pkg = require('../package.json');
const languages = require('../languages.json');
const src = fs.readFileSync(path.join(__dirname, '..', 'extension.js'), 'utf8');
assert.equal(pkg.version, '6.1.2');
assert(pkg.contributes.commands.some(c => c.command === 'activityLab.start'));
assert(pkg.contributes.commands.some(c => c.command === 'activityLab.stop'));
assert(languages.length >= 130);
for (const name of ['Assembly (x86/NASM)','SQL','Bash','Markdown','TypeScript (React TSX)','Python','Dockerfile','Terraform']) {
  if (name === 'Terraform') assert(languages.some(l => l.label === 'HCL / Terraform'));
  else assert(languages.some(l => l.label === name), name);
}
assert(src.includes('Until I stop'));
assert(src.includes('canPickMany: true'));
assert(src.includes('activityLab.presets'));
assert(src.includes('synthetic_additions'));
assert(src.includes('synthetic_deletions'));
assert(src.includes('pickPattern'));
assert(!src.includes("require('node:https')"));
assert(src.includes('minutes: 480'));
assert(!src.includes('https.get'));
assert(!src.includes('api_key='));
console.log(`PASS: package/source validation (${languages.length} offline profiles).`);
