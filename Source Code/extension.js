'use strict';

// Activity Lab is a synthetic editor-behavior test, not a WakaTime heartbeat sender.
// It does not contact WakaTime with credentials, spoof users/OSes, or report hours.
const vscode = require('vscode');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const LANGUAGES = require('./languages.json');
const { PATTERNS, buildPlan } = require('./linePatterns');

const ROOT = path.join(os.homedir(), '.vscode-activity-lab');
const PROJECT = 'ActivityLab-Synthetic';
const ONLINE_URL = 'https://api.wakatime.com/api/v1/program_languages';
const CATALOG_PAGES_LIMIT = 100;
const MAX_FILE_BYTES = 2_000_000;
const MAX_SESSION_BYTES = 10_000_000;
const byName = new Map(LANGUAGES.map(l => [l.label.toLowerCase(), l]));
const STACKS = {
  'Full-stack demo': ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'TypeScript (React TSX)', 'Python', 'SQL', 'Bash', 'Dockerfile', 'Markdown'],
  'Backend / DevOps demo': ['Python', 'Go', 'Java', 'SQL', 'Bash', 'Dockerfile', 'YAML', 'PowerShell'],
  'Low-level demo': ['Assembly (x86/NASM)', 'C', 'C++', 'Rust', 'Zig', 'CMake', 'Markdown'],
  'Mobile demo': ['Kotlin', 'Swift', 'Flutter (Dart)', 'JSON', 'XML', 'Markdown']
};

let active = null;
let statusBar = null;
let verifiedCatalog = null;

function formatElapsed(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55) || 'custom';
}
function formatStatus() {
  if (!statusBar) return;
  if (!active?.running) {
    statusBar.text = '$(circle-slash) Activity Lab: OFF';
    statusBar.tooltip = 'Synthetic editor test is stopped. Click to start.';
    statusBar.command = 'activityLab.start';
  } else {
    const s = active;
    const time = s.endsAt === null ? 'until stopped' : `${Math.max(0, Math.ceil((s.endsAt - Date.now()) / 60000))}m left`;
    statusBar.text = `$(pulse) SYNTHETIC +${s.additions}/-${s.deletions} · ${time}`;
    statusBar.tooltip = `LOCAL simulated changes (NOT WakaTime stats)\nLanguage: ${s.currentLanguage?.label || s.languages[0].label}\nMode: ${s.pattern.label}\nAdditions +${s.additions} / Deletions -${s.deletions}\nRunning ${formatElapsed(Date.now()-s.startedAt)}\n${s.folder}\nClick to STOP`;
    statusBar.command = 'activityLab.stop';
  }
  statusBar.show();
}
function headerFor(language) {
  const caution = 'SYNTHETIC ACTIVITY LAB — NOT ACTUAL CODING WORK';
  switch (language.comment) {
    case 'json': return JSON.stringify({ _activity_lab: caution }, null, 2) + '\n';
    case 'csv': return 'synthetic_test,value\n';
    case 'html': case 'xml': return `<!-- ${caution} -->\n`;
    case 'css': return `/* ${caution} */\n`;
    case 'markdown': return `<!-- ${caution} -->\n# Activity Lab Synthetic Notes\n`;
    case 'sql': case 'dash': return `-- ${caution}\n`;
    case 'semi': return `; ${caution}\n`;
    case 'percent': return `% ${caution}\n`;
    case 'bang': return `! ${caution}\n`;
    case 'paren': return `(* ${caution} *)\n`;
    case 'brace': return `{ ${caution} }\n`;
    case 'star': return `* ${caution}\n`;
    case 'quote': return `' ${caution}\n`;
    case 'rem': return `REM ${caution}\n`;
    case 'slash': return `// ${caution}\n`;
    default: return `# ${caution}\n`;
  }
}
function snippetFor(language, n) {
  const a = n % 57 + 5;
  const b = n % 23 + 2;
  if (language.comment === 'json') {
    return JSON.stringify({ _activity_lab: 'SYNTHETIC TEST ONLY', demo_tick: n }, null, 2) + '\n';
  }
  if (language.comment === 'csv') return `synthetic_step_${n},${a*b}\n`;
  const id = language.id;
  if (id === 'python') return `synthetic_step_${n} = ${a} * ${b}\n`;
  if (id === 'javascript' || id === 'javascriptreact') return `const syntheticStep${n} = ${a} * ${b};\n`;
  if (id === 'typescript' || id === 'typescriptreact') return `const syntheticStep${n}: number = ${a} * ${b};\n`;
  if (id === 'shellscript' || id === 'fish') return `synthetic_step_${n}=$(( ${a} * ${b} ))\n`;
  if (id === 'powershell') return `$syntheticStep${n} = ${a} * ${b}\n`;
  if (id === 'sql') return `SELECT ${a*b} AS synthetic_step_${n};\n`;
  if (id === 'asm') return `mov eax, ${a}\n`;
  if (id === 'markdown' || id === 'mdx') return `- Simulated note ${n} (not real work)\n`;
  if (id === 'html') return `<p data-synthetic="true">Simulated ${n}</p>\n`;
  if (id === 'css' || id === 'scss' || id === 'less') return `.synthetic-step-${n} { width: ${a+b}px; }\n`;
  if (id === 'go') return `var syntheticStep${n} = ${a} * ${b}\n`;
  if (id === 'rust') return `const SYNTHETIC_STEP_${n}: i32 = ${a*b};\n`;
  if (id === 'java') return `class SyntheticStep${n} { static final int value = ${a*b}; }\n`;
  if (id === 'php') return `<?php $syntheticStep${n} = ${a*b}; ?>\n`;
  if (id === 'c' || id === 'cpp') return `int synthetic_step_${n} = ${a*b};\n`;
  if (id === 'lua') return `local synthetic_step_${n} = ${a*b}\n`;
  if (language.comment === 'html' || language.comment === 'xml') return `<!-- synthetic step ${n} -->\n`;
  if (language.comment === 'css') return `/* synthetic step ${n} */\n`;
  const generic = headerFor(language).split('\n')[0];
  return generic.replace('SYNTHETIC ACTIVITY LAB — NOT ACTUAL CODING WORK', `synthetic step ${n}`) + '\n';
}
// Each generated record is a single placeholder line. All changes are isolated
// to our scratch folder; actual WakaTime metrics are never inferred here.
function fullRange(document) {
  return new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
}
function recordFor(language, sequence) {
  if (language.comment === 'json') return `synthetic_line_${sequence}`;
  const lines = snippetFor(language, sequence).split(/\r?\n/).filter(Boolean);
  return (lines[0] || `# synthetic line ${sequence}`) + '\n';
}
function renderJson(records) {
  return JSON.stringify({
    _activity_lab: 'SYNTHETIC TEST ONLY — NOT ACTUAL CODING',
    entries: records.map((value, index) => ({ index: index + 1, label: value }))
  }, null, 2) + '\n';
}
async function applyStep(session, file, language) {
  const doc = await vscode.workspace.openTextDocument(file.uri);
  const current = doc.getText();
  const expected = file.json ? renderJson(file.records) : file.header + file.records.join('');
  if (current !== expected) throw new Error('Scratch file was modified outside Activity Lab; stopping to protect manual edits.');

  const plan = buildPlan(session.pattern, file.records.length);
  const toRemove = file.records.slice(0, plan.remove);
  const newRecords = Array.from({ length: plan.add }, (_, index) => recordFor(language, ++session.sequence));
  const remaining = file.records.slice(plan.remove).concat(newRecords);
  const nextText = file.json ? renderJson(remaining) : file.header + remaining.join('');
  if (Buffer.byteLength(nextText, 'utf8') > MAX_FILE_BYTES ||
      session.totalBytes - Buffer.byteLength(current,'utf8') + Buffer.byteLength(nextText,'utf8') > MAX_SESSION_BYTES) {
    throw new Error('The scratch file reached the 2 MB/file or 10 MB/session safety quota. Stop this experiment and clean up old scratch sessions.');
  }

  const edit = new vscode.WorkspaceEdit();
  if (file.json) {
    // JSON requires serialized object replacement to keep it syntactically valid.
    // WakaTime might interpret this as one larger replacement operation.
    edit.replace(file.uri, fullRange(doc), nextText);
  } else {
    if (plan.remove) {
      const from = file.header.length;
      const through = from + toRemove.join('').length;
      edit.delete(file.uri, new vscode.Range(doc.positionAt(from), doc.positionAt(through)));
    }
    edit.insert(file.uri, doc.positionAt(current.length), newRecords.join(''));
  }
  if (!await vscode.workspace.applyEdit(edit)) throw new Error('VS Code refused a synthetic edit.');
  const saved = await vscode.workspace.openTextDocument(file.uri);
  if (!await saved.save()) throw new Error('VS Code refused to save the synthetic file.');

  file.records = remaining;
  session.totalBytes += Buffer.byteLength(nextText,'utf8') - Buffer.byteLength(current,'utf8');
  session.additions += plan.add;
  session.deletions += plan.remove;
  session.edits += 1;
}
async function showLanguageFile(language, uri) {
  let doc = await vscode.workspace.openTextDocument(uri);
  // File association can be ambiguous. If an installed VS Code grammar exists,
  // use it; WakaTime may still classify the file differently.
  try {
    if (vscode.languages?.getLanguages && vscode.languages?.setTextDocumentLanguage) {
      const installed = await vscode.languages.getLanguages();
      if (language.id !== 'plaintext' && installed.includes(language.id) && doc.languageId !== language.id) {
        doc = await vscode.languages.setTextDocumentLanguage(doc, language.id);
      }
    }
  } catch (_) { /* Keep the document open; language mode is best-effort. */ }
  await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: false });
}
async function doStep(session) {
  if (!session.running || active !== session || session.busy) return;
  if (session.endsAt !== null && Date.now() >= session.endsAt) {
    stopSession('Automatic session limit reached.');
    return;
  }
  session.busy = true;
  try {
    const language = session.languages[session.tick % session.languages.length];
    const file = session.files[language.key];
    if (session.languages.length > 1) await showLanguageFile(language, file.uri);
    session.currentLanguage = language;
    session.tick += 1;
    if (!session.running || active !== session) return;
    await applyStep(session, file, language);
    formatStatus();
  } catch (error) {
    stopSession('Stopped due to an editing error.');
    void vscode.window.showErrorMessage(`Activity Lab: ${error.message}`);
  } finally {
    session.busy = false;
  }
}
function writeReport(session) {
  const report = {
    type: 'LOCAL_SYNTHETIC_TEST_REPORT',
    note: 'Generated from local placeholder operations. NOT verified WakaTime heartbeats, dashboard additions, deletions, or work hours.',
    project: PROJECT,
    platform: process.platform,
    started_at: new Date(session.startedAt).toISOString(),
    stopped_at: new Date().toISOString(),
    pattern: session.pattern.label,
    synthetic_additions: session.additions,
    synthetic_deletions: session.deletions,
    synthetic_steps: session.edits,
    elapsed_wall_clock_seconds: Math.floor((Date.now() - session.startedAt) / 1000),
    wakatime_verified: false
  };
  fs.writeFileSync(path.join(session.folder, 'session-report.json'), JSON.stringify(report, null, 2) + '\n');
}
function stopSession(message = 'Synthetic session stopped.') {
  if (!active) return;
  const previous = active;
  previous.running = false;
  clearInterval(previous.editTimer);
  clearInterval(previous.statusTimer);
  active = null;
  try { writeReport(previous); } catch (error) {
    void vscode.window.showWarningMessage(`Activity Lab could not save the local report: ${error.message}`);
  }
  formatStatus();
  void vscode.window.showInformationMessage(`${message} Local synthetic +${previous.additions}/-${previous.deletions} lines, ${previous.edits} steps in ${formatElapsed(Date.now()-previous.startedAt)}. WakaTime stats not confirmed. Folder: ${previous.folder}`);
}
async function inputCustomLanguage(name = null) {
  const label = name || await vscode.window.showInputBox({ prompt: 'Language/file type name (label only)', validateInput: v => v.trim().length ? undefined : 'Enter a name' });
  if (!label) return null;
  const ext = await vscode.window.showInputBox({ prompt: 'File extension, such as .asm, .sql, .md or .myext', value: '.txt', validateInput: v => /^\.[a-zA-Z0-9][a-zA-Z0-9._+-]{0,19}$/.test(v) ? undefined : 'Use a safe extension like .abc (no folder characters)' });
  if (!ext) return null;
  const installed = vscode.languages?.getLanguages ? (await vscode.languages.getLanguages()) : ['plaintext'];
  const modes = [...new Set(['plaintext', ...installed])].sort().map(id => ({ label: id, id }));
  const picked = await vscode.window.showQuickPick(modes, { placeHolder: 'Select a VS Code language mode installed on this computer. Plain Text may show as Other in WakaTime.', matchOnDescription: true });
  if (!picked) return null;
  return { label: label.trim().slice(0, 80), id: picked.id, ext, category: 'Custom / online catalog', comment: 'hash' };
}
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 12000, headers: { 'Accept': 'application/json', 'User-Agent': 'ActivityLab/3.0 (verified languages only)' } }, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`WakaTime returned HTTP ${res.statusCode}`)); }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; if (body.length > 3_000_000) req.destroy(new Error('Response too large')); });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('WakaTime language API timed out')));
    req.on('error', reject);
  });
}
async function onlineLanguages() {
  if (verifiedCatalog) return verifiedCatalog;
  const names = new Map();
  const first = await fetchJson(ONLINE_URL + '?page=1');
  const pages = Number(first.total_pages || 1);
  if (!Number.isInteger(pages) || pages > CATALOG_PAGES_LIMIT) {
    throw new Error(`Online catalog has ${pages} pages (safety limit: ${CATALOG_PAGES_LIMIT}). Try the built-in language list.`);
  }
  function add(response) {
    if (!Array.isArray(response.data)) throw new Error('Unexpected WakaTime API response');
    for (const item of response.data) if (item?.name && item.is_verified !== false) names.set(item.name.toLowerCase(), item.name);
  }
  add(first);
  for (let page = 2; page <= pages; page++) add(await fetchJson(ONLINE_URL + `?page=${page}`));
  verifiedCatalog = [...names.values()].sort((a,b) => a.localeCompare(b));
  return verifiedCatalog;
}
async function pickLanguages() {
  const type = await vscode.window.showQuickPick([
    { label: 'Single language — offline catalog', detail: `${LANGUAGES.length} file/language profiles included`, kind: 'local' },
    { label: 'Full-stack / multi-language demo rotation', detail: 'Several separate synthetic files, rotating automatically', kind: 'stack' },
    { label: 'All verified WakaTime languages — online', detail: 'Loads official language names; unknown file extensions/modes require manual setup', kind: 'online' },
    { label: 'Custom language / extension', detail: 'Choose extension and installed VS Code language mode', kind: 'custom' }
  ], { placeHolder: 'What would you like to simulate?' });
  if (!type) return null;
  if (type.kind === 'stack') {
    const group = await vscode.window.showQuickPick(Object.keys(STACKS), { placeHolder: 'Choose a rotating technology stack' });
    return group ? STACKS[group].map(name => byName.get(name.toLowerCase())).filter(Boolean) : null;
  }
  if (type.kind === 'custom') {
    const choice = await inputCustomLanguage();
    return choice ? [choice] : null;
  }
  if (type.kind === 'online') {
    try {
      const names = await onlineLanguages();
      const picked = await vscode.window.showQuickPick(names.map(label => ({ label, description: byName.has(label.toLowerCase()) ? 'Ready-made file profile' : 'Extension setup needed' })), { placeHolder: `Verified WakaTime languages (${names.length}) — type to search`, matchOnDescription: true });
      if (!picked) return null;
      const known = byName.get(picked.label.toLowerCase());
      if (known) return [known];
      const custom = await inputCustomLanguage(picked.label);
      return custom ? [custom] : null;
    } catch (error) {
      void vscode.window.showWarningMessage(`Cannot load WakaTime language list: ${error.message}. Use built-in list instead.`);
      return null;
    }
  }
  const choice = await vscode.window.showQuickPick(LANGUAGES.map(item => ({ label: item.label, description: `${item.category}  ·  ${item.ext}`, data: item })), { placeHolder: `Select from ${LANGUAGES.length} bundled language/file profiles`, matchOnDescription: true });
  return choice ? [choice.data] : null;
}
async function pickDuration() {
  const durations = [
    { label: '5 minutes', minutes: 5 },
    { label: '15 minutes', minutes: 15 },
    { label: '30 minutes', minutes: 30 },
    { label: '1 hour', minutes: 60 },
    { label: '2 hours', minutes: 120 },
    { label: '4 hours', minutes: 240 },
    { label: '6 hours', minutes: 360 },
    { label: '8 hours', minutes: 480 },
    { label: 'Custom — up to 8 hours', custom: true },
    { label: 'Until I stop (no automatic time limit)', minutes: null }
  ];
  const picked = await vscode.window.showQuickPick(durations, { placeHolder: 'Set a session limit, or continue until manually stopped' });
  if (!picked) return undefined;
  if (!picked.custom) return picked.minutes;
  const value = await vscode.window.showInputBox({ prompt: 'Custom duration in minutes (1–480)', value: '180', validateInput: s => /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= 480 ? undefined : 'Use whole minutes from 1 through 480' });
  return value ? Number(value) : undefined;
}
async function pickPattern() {
  const options = Object.values(PATTERNS).map(pattern => ({
    label: pattern.label,
    description: pattern.description,
    data: pattern
  }));
  const picked = await vscode.window.showQuickPick(options, {
    placeHolder: 'Choose LOCAL placeholder line additions/deletions — not guaranteed WakaTime stats'
  });
  return picked?.data || null;
}
async function startSession() {
  if (active?.running) {
    void vscode.window.showWarningMessage('A synthetic session is already running; stop it before starting a new one.');
    return;
  }
  const selected = await pickLanguages();
  if (!selected?.length) return;
  const minutes = await pickDuration();
  if (minutes === undefined) return;
  const pattern = await pickPattern();
  if (!pattern) return;
  const interval = await vscode.window.showQuickPick([15,30,60,120].map(seconds => ({ label: `${seconds} seconds between steps`, seconds })), { placeHolder: 'Choose an edit interval (the session runs continuously until the timer or manual Stop)' });
  if (!interval) return;
  const confirm = await vscode.window.showWarningMessage(
    `SIMULATED editing, not real programming work, NOT guaranteed WakaTime stats. Lines: ${pattern.label}. Time: ${minutes === null ? 'until manually stopped' : `${minutes} minute(s)`}; languages: ${selected.length}. Local counters are not server counts.`,
    { modal: true }, 'Start synthetic experiment'
  );
  if (confirm !== 'Start synthetic experiment') return;

  try {
    fs.mkdirSync(ROOT, { recursive: true });
    fs.writeFileSync(path.join(ROOT, '.wakatime-project'), PROJECT + '\n');
    const folder = path.join(ROOT, `session-${new Date().toISOString().replace(/[:.]/g,'-')}-${process.pid}`);
    fs.mkdirSync(folder, { recursive: false });
    fs.writeFileSync(path.join(folder, '.wakatime-project'), PROJECT + '\n');
    fs.writeFileSync(path.join(folder, 'SYNTHETIC_TEST_README.txt'), 'SYNTHETIC TEST ONLY. These edits do not represent real developer working hours.\n');
    const files = {};
    const langs = selected.map((lang, index) => ({ ...lang, key: `${index}` }));
    for (const lang of langs) {
      const header = headerFor(lang);
      const file = path.join(folder, `demo_${slugify(lang.label)}_${lang.key}${lang.ext}`);
      const json = lang.comment === 'json';
      const initial = json ? renderJson([]) : header;
      fs.writeFileSync(file, initial, { flag: 'wx', encoding: 'utf8' });
      files[lang.key] = { uri: vscode.Uri.file(file), header, json, records: [] };
    }
    await showLanguageFile(langs[0], files[langs[0].key].uri);
    const startedAt = Date.now();
    const session = {
      folder, languages: langs, files, currentLanguage: langs[0], startedAt, pattern,
      endsAt: minutes === null ? null : startedAt + minutes*60*1000,
      running: true, busy: false, tick: 0, edits: 0, additions: 0, deletions: 0, sequence: 0,
      totalBytes: langs.reduce((n, lang) => n + Buffer.byteLength(lang.comment === 'json' ? renderJson([]) : headerFor(lang), 'utf8'), 0),
      editTimer: null, statusTimer: null
    };
    active = session;
    formatStatus();
    session.editTimer = setInterval(() => { void doStep(session); }, interval.seconds * 1000);
    session.statusTimer = setInterval(() => {
      if (session.endsAt !== null && Date.now() >= session.endsAt) stopSession('Session time limit reached.');
      else formatStatus();
    }, 10000);
    void doStep(session);
    void vscode.window.showInformationMessage(`Activity Lab started (synthetic only). Platform: ${process.platform}. Folder: ${folder}`);
  } catch (error) {
    if (active?.running) stopSession('Setup error.');
    void vscode.window.showErrorMessage(`Activity Lab failed to start: ${error.message}`);
  }
}
function showStatus() {
  if (!active?.running) return void vscode.window.showInformationMessage('Activity Lab is OFF. No synthetic files are being edited.');
  const s = active;
  const limit = s.endsAt === null ? 'Until manually stopped' : `${Math.max(0, Math.ceil((s.endsAt-Date.now())/60000))} minutes remaining`;
  void vscode.window.showInformationMessage(`LOCAL SYNTHETIC +${s.additions}/-${s.deletions} placeholder lines | ${s.pattern.label} | ${s.languages.length} language(s) | ${s.edits} steps | ${formatElapsed(Date.now()-s.startedAt)} elapsed | ${limit} | WakaTime unverified | ${s.folder}`);
}
function activate(context) {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBar);
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.start', startSession));
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.stop', () => active ? stopSession() : showStatus()));
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.status', showStatus));
  formatStatus();
}
function deactivate() {
  if (active) {
    active.running = false;
    clearInterval(active.editTimer);
    clearInterval(active.statusTimer);
    active = null;
  }
}
module.exports = { activate, deactivate };
