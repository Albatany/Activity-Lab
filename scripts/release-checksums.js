'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { version } = require('../package.json');
const directory = path.join(__dirname, '..', 'release');
const installers = [`activity-lab-synthetic-${version}.vsix`, 'activity-lab-intellij-6.0.0.zip'];
const lines = installers.map(name => {
  const bytes = fs.readFileSync(path.join(directory, name));
  return `${createHash('sha256').update(bytes).digest('hex')}  ${name}`;
});
fs.writeFileSync(path.join(directory, 'SHA256SUMS.txt'), lines.join('\n') + '\n');
console.log(`Updated checksums for ${installers.length} release installers.`);
