'use strict';
const fs = require('node:fs');
const path = require('node:path');
const languages = require('../languages.json');
const { MODES } = require('../modes');
const { STEMS, GENERIC } = require('../fileNaming');
const dir = path.join(__dirname, '../intellij/src/main/resources/catalog');
const entries = {
  'languages.json': languages,
  'modes.json': MODES,
  'filenames.json': { stems: STEMS, generic: GENERIC }
};
for (const [name, data] of Object.entries(entries)) {
  const text = JSON.stringify(data, null, 2) + '\n';
  const file = path.join(dir, name);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text)
      throw new Error(`Catalog is out of date: ${name}. Run node scripts/sync-intellij-catalog.js.`);
  } else {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, text);
  }
}
console.log(`IntelliJ catalog: ${languages.length} profiles, ${MODES.length} modes.`);
