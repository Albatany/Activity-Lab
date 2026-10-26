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
const { MODES, resolveModes } = require('./modes');
const { buildFileName, validateProjectName } = require('./fileNaming');
const { MAX_SELECTED_LANGUAGES, LAST_SELECTED_KEY, normalizeProfiles, readPresets, savePreset, deletePreset, buildQuickPickItems } = require('./languageSelection');

const ROOT = path.join(os.homedir(), '.vscode-activity-lab');
const DEFAULT_PROJECT = 'ActivityLab Synthetic';
const PROFESSIONAL_MODES = resolveModes(MODES, LANGUAGES);
const ONLINE_URL = 'https://api.wakatime.com/api/v1/program_languages';
const CATALOG_PAGES_LIMIT = 100;
const MAX_FILE_BYTES = 2_000_000;
const MAX_SESSION_BYTES = 10_000_000;
const byName = new Map(LANGUAGES.map(l => [l.label.toLowerCase(), l]));

let active = null;
let statusBar = null;
let verifiedCatalog = null;
let extensionState = null;

function formatElapsed(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function formatStatus() {
  if (!statusBar) return;
  if (!active?.running) {
    statusBar.text = '$(beaker) Activity Lab · Ready';
    statusBar.tooltip = 'Synthetic editor lab. Select to begin a new session.';
    statusBar.command = 'activityLab.start';
  } else {
    const s = active;
    const time = s.endsAt === null ? 'Until stopped' : `${Math.max(0, Math.ceil((s.endsAt - Date.now()) / 60000))} min left`;
    statusBar.text = `$(beaker) Lab +${s.additions} −${s.deletions} · ${time}`;
    statusBar.tooltip = `ACTIVITY LAB | LOCAL SIMULATION\nProject: ${s.project}\nSelection: ${s.mode}\nLanguage: ${s.currentLanguage?.label || s.languages[0].label}\nTotal languages: ${s.languages.length}\nPattern: ${s.pattern.label}\nSynthetic line changes: +${s.additions} / −${s.deletions}\nElapsed: ${formatElapsed(Date.now()-s.startedAt)}\nNot verified WakaTime metrics\nSelect to stop\n© Albatany 2026`;
    statusBar.command = 'activityLab.stop';
  }
  statusBar.show();
}
function headerFor(language) {
  const caution = 'ACTIVITY LAB SIMULATION ONLY — NOT REAL CODING WORK';
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
  return generic.replace('ACTIVITY LAB SIMULATION ONLY — NOT REAL CODING WORK', `synthetic step ${n}`) + '\n';
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
  if (current !== expected) throw new Error('A scratch file was edited manually. The session stopped to protect your changes.');

  const plan = buildPlan(session.pattern, file.records.length);
  const toRemove = file.records.slice(0, plan.remove);
  const newRecords = Array.from({ length: plan.add }, (_, index) => recordFor(language, ++session.sequence));
  const remaining = file.records.slice(plan.remove).concat(newRecords);
  const nextText = file.json ? renderJson(remaining) : file.header + remaining.join('');
  if (Buffer.byteLength(nextText, 'utf8') > MAX_FILE_BYTES ||
      session.totalBytes - Buffer.byteLength(current,'utf8') + Buffer.byteLength(nextText,'utf8') > MAX_SESSION_BYTES) {
    throw new Error('Size limit reached: 2 MB per file or 10 MB per session. Remove old experiments if needed.');
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
  if (!await vscode.workspace.applyEdit(edit)) throw new Error('VS Code rejected the scratch file edit.');
  const saved = await vscode.workspace.openTextDocument(file.uri);
  if (!await saved.save()) throw new Error('VS Code could not save the scratch file.');

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
    void vscode.window.showErrorMessage(`Activity Lab stopped: ${error.message}`);
  } finally {
    session.busy = false;
  }
}
function writeReport(session) {
  const report = {
    type: 'LOCAL_SYNTHETIC_TEST_REPORT',
    note: 'Generated from local placeholder operations. NOT verified WakaTime heartbeats, dashboard additions, deletions, or work hours.',
    project: session.project,
    simulated_mode: session.mode,
    selection_type: session.selectionType || 'curated',
    selected_languages: session.languages.map(language => language.label),
    files: session.languages.map(language => ({ language: language.label, name: session.files[language.key].fileName })),
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
    void vscode.window.showWarningMessage(`Could not save the Activity Lab report: ${error.message}`);
  }
  formatStatus();
  void vscode.window.showInformationMessage(`Session finished. Local synthetic changes: +${previous.additions} / −${previous.deletions}; ${previous.edits} steps over ${formatElapsed(Date.now()-previous.startedAt)}. WakaTime metrics are not verified. Report: ${previous.folder}`);
}
async function inputCustomLanguage(name = null) {
  const label = name || await vscode.window.showInputBox({
    title: 'Custom file profile', prompt: 'Language or file type name',
    validateInput: value => value.trim().length ? undefined : 'Enter a language name.'
  });
  if (!label) return null;
  const ext = await vscode.window.showInputBox({
    title: 'File extension', prompt: 'Enter a file extension, for example .asm, .sql, .md, or .foo',
    value: '.txt', validateInput: v => /^\.[a-zA-Z0-9][a-zA-Z0-9._+-]{0,19}$/.test(v) ? undefined : 'Enter a safe extension beginning with a period.'
  });
  if (!ext) return null;
  const installed = vscode.languages?.getLanguages ? await vscode.languages.getLanguages() : ['plaintext'];
  const modes = [...new Set(['plaintext', ...installed])].sort().map(id => ({ label: id, id }));
  const picked = await vscode.window.showQuickPick(modes, {
    title: 'VS Code syntax mode', placeHolder: 'A file extension does not guarantee how tracking tools classify a language.'
  });
  if (!picked) return null;
  return { label: label.trim().slice(0, 80), id: picked.id, ext, category: 'Custom file profile', comment: 'hash' };
}
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 12000, headers: { 'Accept': 'application/json', 'User-Agent': 'ActivityLab/5.0 (verified languages only)' } }, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`WakaTime returned HTTP ${res.statusCode}`)); }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; if (body.length > 3_000_000) req.destroy(new Error('Catalog response exceeded the size limit')); });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('WakaTime language catalog did not respond')));
    req.on('error', reject);
  });
}
async function onlineLanguages() {
  if (verifiedCatalog) return verifiedCatalog;
  const names = new Map();
  const first = await fetchJson(ONLINE_URL + '?page=1');
  const pages = Number(first.total_pages || 1);
  if (!Number.isInteger(pages) || pages > CATALOG_PAGES_LIMIT) {
    throw new Error(`The online catalog exceeds the ${CATALOG_PAGES_LIMIT}-page safety limit.`);
  }
  function add(response) {
    if (!Array.isArray(response.data)) throw new Error('Unexpected WakaTime API response format.');
    for (const item of response.data) if (item?.name && item.is_verified !== false) names.set(item.name.toLowerCase(), item.name);
  }
  add(first);
  for (let page = 2; page <= pages; page++) add(await fetchJson(ONLINE_URL + `?page=${page}`));
  verifiedCatalog = [...names.values()].sort((a,b) => a.localeCompare(b));
  return verifiedCatalog;
}
async function saveSelectedAsPreset(profiles) {
  if (!extensionState?.update) return true;
  const action = await vscode.window.showQuickPick([
    { label: 'Use this selection', action: 'use', description: 'Start without saving a preset' },
    { label: 'Save as a reusable preset', action: 'save', description: 'Available in future sessions' }
  ], { title: 'Your language combination', placeHolder: `${profiles.length} selected languages` });
  if (!action) return false;
  if (action.action === 'save') {
    const name = await vscode.window.showInputBox({
      title: 'Name your language preset', placeHolder: 'My Web Stack',
      validateInput: text => {
        const value = (text || '').trim();
        if (!value || value.length > 40 || !/^[\p{L}\p{N}][\p{L}\p{N} _().+]{0,39}$/u.test(value))
          return 'Use 1 to 40 letters, numbers, spaces, or underscores.';
        return undefined;
      }
    });
    if (name === undefined) return false;
    try {
      await savePreset(extensionState, LANGUAGES, name, profiles);
      void vscode.window.showInformationMessage(`Saved language preset: ${name.trim()}`);
    } catch (error) {
      void vscode.window.showWarningMessage(`Could not save preset: ${error.message}`);
    }
  }
  return true;
}
async function pickMultipleOfflineLanguages() {
  const previous = extensionState?.get?.(LAST_SELECTED_KEY, []) || [];
  const selected = await vscode.window.showQuickPick(buildQuickPickItems(LANGUAGES, previous), {
    title: 'Choose your own languages',
    placeHolder: `Search and select multiple languages (up to ${MAX_SELECTED_LANGUAGES})`,
    canPickMany: true, matchOnDescription: true, matchOnDetail: true,
    ignoreFocusOut: true
  });
  if (!selected) return null;
  let profiles;
  try { profiles = normalizeProfiles(selected.map(item => item.profile), LANGUAGES); }
  catch (error) { void vscode.window.showWarningMessage(error.message); return null; }
  const proceed = await saveSelectedAsPreset(profiles);
  if (!proceed) return null;
  await extensionState?.update?.(LAST_SELECTED_KEY, profiles.map(profile => profile.label));
  return { languages: profiles, mode: 'Custom Language Selection', selectionType: 'multi_select' };
}
async function pickSavedPreset() {
  const saved = readPresets(extensionState, LANGUAGES);
  if (!saved.length) {
    void vscode.window.showInformationMessage('No saved presets yet. Use Choose multiple languages to create one.');
    return null;
  }
  const chosen = await vscode.window.showQuickPick(saved.map(preset => ({
    label: preset.name, description: `${preset.languages.length} languages`,
    detail: preset.languages.join(', '), preset
  })), { title: 'Saved language presets', placeHolder: 'Choose a reusable language combination', matchOnDetail: true });
  if (!chosen) return null;
  return { languages: normalizeProfiles(chosen.preset.languages, LANGUAGES), mode: `Preset: ${chosen.preset.name}`, selectionType: 'preset' };
}
async function managePresets() {
  const saved = readPresets(extensionState, LANGUAGES);
  if (!saved.length) return void vscode.window.showInformationMessage('No saved language presets to manage.');
  const chosen = await vscode.window.showQuickPick(saved.map(entry => ({
    label: entry.name, description: `${entry.languages.length} languages`, detail: entry.languages.join(', '), entry
  })), { title: 'Manage language presets', placeHolder: 'Choose a preset to delete', matchOnDetail: true });
  if (!chosen) return;
  const answer = await vscode.window.showWarningMessage(
    `Delete the saved preset "${chosen.entry.name}"? No scratch files will be removed.`, { modal: true }, 'Delete preset'
  );
  if (answer !== 'Delete preset') return;
  await deletePreset(extensionState, LANGUAGES, chosen.entry.name);
  void vscode.window.showInformationMessage(`Deleted preset: ${chosen.entry.name}`);
}
async function pickLanguages() {
  const type = await vscode.window.showQuickPick([
    { label: '$(checklist) Choose multiple languages', description: `Select your own combination from ${LANGUAGES.length} built-in profiles`, kind: 'multiple' },
    { label: '$(layers) Professional modes', description: `${PROFESSIONAL_MODES.length} curated technology tracks`, kind: 'mode' },
    { label: '$(bookmark) Saved language presets', description: 'Reuse a selection you created earlier', kind: 'presets' },
    { label: '$(code) Single language', description: 'One language or file profile', kind: 'local' },
    { label: '$(cloud-download) WakaTime language catalog', description: 'Optional online list; unrecognized files require mapping', kind: 'online' },
    { label: '$(settings-gear) Custom file type', description: 'Provide a file extension and VS Code syntax mode', kind: 'custom' }
  ], { title: 'Activity Lab | Choose a simulation type', placeHolder: 'Pick your languages or start from a curated mode' });
  if (!type) return null;
  if (type.kind === 'multiple') return pickMultipleOfflineLanguages();
  if (type.kind === 'presets') return pickSavedPreset();
  if (type.kind === 'mode') {
    const chosen = await vscode.window.showQuickPick(PROFESSIONAL_MODES.map(mode => ({
      label: mode.title, description: mode.category,
      detail: `${mode.summary} · ${mode.profiles.length} languages`, mode
    })), { title: 'Professional modes', placeHolder: 'Search for a technology track', matchOnDescription: true, matchOnDetail: true });
    return chosen ? { languages: chosen.mode.profiles, mode: chosen.mode.title, selectionType: 'curated' } : null;
  }
  if (type.kind === 'custom') {
    const choice = await inputCustomLanguage();
    return choice ? { languages: [choice], mode: 'Custom File Type', selectionType: 'custom' } : null;
  }
  if (type.kind === 'online') {
    try {
      const names = await onlineLanguages();
      const picked = await vscode.window.showQuickPick(names.map(label => ({
        label, description: byName.has(label.toLowerCase()) ? 'Built-in file profile' : 'Requires file extension mapping'
      })), { title: 'WakaTime verified language catalog',
        placeHolder: `Choose one of ${names.length} catalog entries`, matchOnDescription: true });
      if (!picked) return null;
      const known = byName.get(picked.label.toLowerCase());
      if (known) return { languages: [known], mode: 'WakaTime Catalog', selectionType: 'online' };
      const custom = await inputCustomLanguage(picked.label);
      return custom ? { languages: [custom], mode: 'Online Custom File Type', selectionType: 'online' } : null;
    } catch (error) {
      void vscode.window.showWarningMessage(`WakaTime catalog unavailable: ${error.message}. Use built-in profiles instead.`);
      return null;
    }
  }
  const choice = await vscode.window.showQuickPick(LANGUAGES.map(item => ({
    label: item.label, description: `${item.category} · ${item.ext}`, data: item
  })), { title: 'Single language', placeHolder: `Search ${LANGUAGES.length} built-in profiles`, matchOnDescription: true });
  return choice ? { languages: [choice.data], mode: 'Single Language', selectionType: 'single' } : null;
}
async function pickProjectName() {
  const name = await vscode.window.showInputBox({
    title: 'Project name | Optional',
    prompt: 'Writes a .wakatime-project marker inside the sandbox. Tracker statistics are not guaranteed.',
    placeHolder: 'Example: Analytics Research 2026', value: '', validateInput: validateProjectName
  });
  if (name === undefined) return undefined;
  return name.trim() || DEFAULT_PROJECT;
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
    { label: 'Custom duration (up to 8 hours)', custom: true },
    { label: 'Until I stop', minutes: null }
  ];
  const picked = await vscode.window.showQuickPick(durations, {
    title: 'Session duration', placeHolder: 'Choose up to 8 hours, or stop manually'
  });
  if (!picked) return undefined;
  if (!picked.custom) return picked.minutes;
  const value = await vscode.window.showInputBox({
    title: 'Custom session duration', prompt: 'Enter minutes from 1 to 480', value: '180',
    validateInput: input => /^\d+$/.test(input) && Number(input) >= 1 && Number(input) <= 480
      ? undefined : 'Enter a whole number from 1 to 480.'
  });
  return value ? Number(value) : undefined;
}
async function pickPattern() {
  const picked = await vscode.window.showQuickPick(Object.values(PATTERNS).map(pattern => ({
    label: pattern.label, description: pattern.description, data: pattern
  })), { title: 'Synthetic line change pattern', placeHolder: 'Local simulation counters, not WakaTime totals' });
  return picked?.data || null;
}
async function startSession() {
  if (active?.running) {
    void vscode.window.showWarningMessage('A session is already running. Stop it before starting another one.');
    return;
  }
  const choice = await pickLanguages();
  if (!choice?.languages?.length) return;
  const selected = choice.languages;
  if (selected.length > MAX_SELECTED_LANGUAGES) {
    void vscode.window.showWarningMessage(`Select up to ${MAX_SELECTED_LANGUAGES} languages per session.`);
    return;
  }
  const project = await pickProjectName();
  if (project === undefined) return;
  const minutes = await pickDuration();
  if (minutes === undefined) return;
  const pattern = await pickPattern();
  if (!pattern) return;
  const interval = await vscode.window.showQuickPick([15,30,60,120].map(seconds => ({ label: `${seconds} seconds`, description: 'Pause between edits', seconds })), { title: 'Edit interval', placeHolder: 'How often should the sandbox file change?' });
  if (!interval) return;
  const confirm = await vscode.window.showWarningMessage(
    `This session generates synthetic editor changes, not actual coding work. WakaTime and other tracking extensions may ignore these events.\n\nProject: ${project}\nSelection: ${choice.mode}\nLanguages: ${selected.length}\nDuration: ${minutes === null ? 'Until I stop' : `${minutes} minutes`}\nPattern: ${pattern.label}`,
    { modal: true }, 'Start simulation'
  );
  if (confirm !== 'Start simulation') return;

  try {
    fs.mkdirSync(ROOT, { recursive: true });
    if (fs.lstatSync(ROOT).isSymbolicLink()) throw new Error('The simulation root folder cannot be a symbolic link.');
    // Keep the root explicitly synthetic; each session has its own project override.
    fs.writeFileSync(path.join(ROOT, '.wakatime-project'), DEFAULT_PROJECT + '\n');
    const folder = path.join(ROOT, `session-${new Date().toISOString().replace(/[:.]/g,'-')}-${require('node:crypto').randomBytes(3).toString('hex')}`);
    fs.mkdirSync(folder, { recursive: false });
    fs.writeFileSync(path.join(folder, '.wakatime-project'), project + '\n');
    fs.writeFileSync(path.join(folder, 'ABOUT_SIMULATION.txt'), 'Activity Lab by Albatany\n\nThis folder contains synthetic test files. It does not represent real coding work, professional experience, or verified time-tracking statistics.\n© Albatany 2026\n');
    const files = {};
    const reserved = new Set();
    const langs = selected.map((lang, index) => ({ ...lang, key: `${index}` }));
    for (const lang of langs) {
      const header = headerFor(lang);
      const fileName = buildFileName(lang, reserved);
      const file = path.join(folder, fileName);
      const json = lang.comment === 'json';
      const initial = json ? renderJson([]) : header;
      fs.writeFileSync(file, initial, { flag: 'wx', encoding: 'utf8' });
      files[lang.key] = { uri: vscode.Uri.file(file), fileName, header, json, records: [] };
    }
    await showLanguageFile(langs[0], files[langs[0].key].uri);
    const startedAt = Date.now();
    const session = {
      folder, project, mode: choice.mode, selectionType: choice.selectionType, languages: langs, files, currentLanguage: langs[0], startedAt, pattern,
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
    void vscode.window.showInformationMessage(`Activity Lab started. Project: ${project}. Sandbox: ${folder}`);
  } catch (error) {
    if (active?.running) stopSession('Setup error.');
    void vscode.window.showErrorMessage(`Could not start Activity Lab: ${error.message}`);
  }
}
function showStatus() {
  if (!active?.running) return void vscode.window.showInformationMessage('Activity Lab is not currently running a session.');
  const s = active;
  const limit = s.endsAt === null ? 'Until manually stopped' : `${Math.max(0, Math.ceil((s.endsAt-Date.now())/60000))} minutes remaining`;
  void vscode.window.showInformationMessage(`Local simulation · ${s.project} · ${s.mode} · ${s.languages.length} languages · +${s.additions} / −${s.deletions} lines · ${s.edits} steps · ${formatElapsed(Date.now()-s.startedAt)} · ${limit}. WakaTime metrics not verified. Folder: ${s.folder}`);
}
function activate(context) {
  extensionState = context.globalState || null;
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBar);
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.start', startSession));
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.stop', () => active ? stopSession() : showStatus()));
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.status', showStatus));
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.presets', managePresets));
  formatStatus();
}
function deactivate() {
  if (active) {
    const previous = active;
    previous.running = false;
    clearInterval(previous.editTimer);
    clearInterval(previous.statusTimer);
    active = null;
    try { writeReport(previous); } catch (_) { /* Host is shutting down. */ }
  }
}
module.exports = { activate, deactivate };
