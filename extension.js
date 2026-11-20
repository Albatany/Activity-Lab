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
const { recordFor, isJson, recordSize, frameFor, headerFor } = require('./snippets');
const { typeStep } = require('./typing');
const { MODES, resolveModes } = require('./modes');
const { buildFileName, validateProjectName } = require('./fileNaming');

const ROOT = path.join(os.homedir(), '.vscode-activity-lab');
const DEFAULT_PROJECT = 'Activity Lab';
const PROFESSIONAL_MODES = resolveModes(MODES, LANGUAGES);
const ONLINE_URL = 'https://api.wakatime.com/api/v1/program_languages';
const CATALOG_PAGES_LIMIT = 100;
const MAX_FILE_BYTES = 2_000_000;
const MAX_SESSION_BYTES = 10_000_000;
const byName = new Map(LANGUAGES.map(l => [l.label.toLowerCase(), l]));

let active = null;
let statusBar = null;
let verifiedCatalog = null;

function formatElapsed(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function timeRemaining(session) {
  if (session.endsAt === null) return 'Until stopped';
  return `${Math.max(0, Math.ceil((session.endsAt - Date.now()) / 60000))} min left`;
}
function sessionDetails(session) {
  return [
    `Project: ${session.project}`, `Mode: ${session.mode}`,
    `Language: ${session.currentLanguage?.label || session.languages[0].label}`,
    `Pattern: ${session.pattern.label}`, `Typing: ${session.animated ? 'Character by character' : 'Instant'}`,
    `Local changes: +${session.additions} / −${session.deletions}`, `Completed steps: ${session.edits}`,
    `Elapsed: ${formatElapsed(Date.now() - session.startedAt)}`, `Duration: ${timeRemaining(session)}`
  ].join('\n');
}
function formatStatus() {
  if (!statusBar) return;
  if (!active?.running) {
    statusBar.text = '$(beaker) Activity Lab';
    statusBar.tooltip = 'Start an Activity Lab session.';
    statusBar.command = 'activityLab.start';
  } else {
    statusBar.text = `$(beaker) Activity Lab  +${active.additions}  −${active.deletions}  (${timeRemaining(active)})`;
    statusBar.tooltip = `Activity Lab\n${sessionDetails(active)}\nClick to stop the session.`;
    statusBar.command = 'activityLab.stop';
  }
  statusBar.show();
}
function fullRange(document) {
  return new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
}
function renderJson(records) {
  return JSON.stringify({
    _activity_lab: 'Activity Lab generated this sample for a local simulation.',
    entries: records.map((record, index) => ({ index: index + 1, ...record }))
  }, null, 2) + '\n';
}
async function applyStep(session, file, language, editor) {
  const doc = editor?.document || await vscode.workspace.openTextDocument(file.uri);
  const current = doc.getText();
  const expected = file.json ? renderJson(file.records) : file.header + file.records.join('') + file.footer;
  if (current !== expected) throw new Error('The scratch file changed outside Activity Lab. Your changes have been preserved.');

  const plan = buildPlan(session.pattern, file.units);
  // Growing patterns retire one standalone row. Balanced batches retire together.
  const first = plan.remove === 1 ? file.records.findIndex(record => recordSize(language, record) === 1) : 0;
  const count = plan.remove === 1 ? 1 : (plan.remove ? file.records.length : 0);
  const retained = file.records.slice();
  const removed = count ? retained.splice(first, count) : [];
  const newRecords = [];
  for (let left = plan.add; left > 0;) {
    const budget = session.pattern.deletions === 1 && left === plan.add ? 1 : left;
    const record = recordFor(language, ++session.sequence, budget);
    newRecords.push(record);
    left -= recordSize(language, record);
  }
  const remaining = retained.concat(newRecords);
  const nextText = file.json ? renderJson(remaining) : file.header + remaining.join('') + file.footer;
  if (Buffer.byteLength(nextText, 'utf8') > MAX_FILE_BYTES ||
      session.totalBytes - Buffer.byteLength(current,'utf8') + Buffer.byteLength(nextText,'utf8') > MAX_SESSION_BYTES) {
    throw new Error('The session reached its size limit (2 MB per file or 10 MB per session).');
  }

  if (!session.running) return;
  if (session.animated) {
    const base = file.json ? renderJson(retained) : file.header + retained.join('') + file.footer;
    if (!await typeStep(session, editor, current, base, nextText)) return;
  } else {
    const edit = new vscode.WorkspaceEdit();
    if (file.json) {
      edit.replace(file.uri, fullRange(doc), nextText);
    } else {
      if (removed.length) {
        const from = file.header.length + file.records.slice(0, first).join('').length;
        const through = from + removed.join('').length;
        edit.delete(file.uri, new vscode.Range(doc.positionAt(from), doc.positionAt(through)));
      }
      edit.insert(file.uri, doc.positionAt(current.length - file.footer.length), newRecords.join(''));
    }
    if (!await vscode.workspace.applyEdit(edit)) throw new Error('VS Code could not apply the edit.');
  }
  if (!await doc.save()) throw new Error('VS Code could not save the scratch file.');
  file.units += plan.add - plan.remove;
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
  return vscode.window.showTextDocument(doc, { preview: false, preserveFocus: false });
}
function nextLanguage(session) {
  if (!session.shuffle) return session.languages[session.tick % session.languages.length];
  if (!session.round.length) {
    session.round = session.languages.slice();
    for (let i = session.round.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [session.round[i], session.round[j]] = [session.round[j], session.round[i]];
    }
    const last = session.round.length - 1;
    if (last > 0 && session.round[last] === session.currentLanguage) {
      [session.round[0], session.round[last]] = [session.round[last], session.round[0]];
    }
  }
  return session.round.pop();
}
function scheduleStep(session) {
  if (!session.running || session.pending) return;
  session.pending = doStep(session).finally(() => { session.pending = null; });
  return session.pending;
}
async function doStep(session) {
  if (!session.running || active !== session) return;
  if (session.endsAt !== null && Date.now() >= session.endsAt) {
    stopSession('Automatic session limit reached.');
    return;
  }
  try {
    const language = nextLanguage(session);
    const file = session.files[language.key];
    const editor = session.languages.length > 1 || session.animated ? await showLanguageFile(language, file.uri) : null;
    session.currentLanguage = language;
    session.tick += 1;
    if (!session.running || active !== session) return;
    await applyStep(session, file, language, editor);
    formatStatus();
  } catch (error) {
    stopSession('Stopped due to an editing error.');
    void vscode.window.showErrorMessage(`Activity Lab stopped. ${error.message}`);
  }
}
function writeReport(session) {
  const report = {
    type: 'LOCAL_SYNTHETIC_TEST_REPORT',
    note: 'Counts cover completed local test edits. WakaTime statistics are tracked separately.',
    project: session.project,
    simulated_mode: session.mode,
    files: session.languages.map(language => ({ language: language.label, name: session.files[language.key].fileName })),
    platform: process.platform,
    started_at: new Date(session.startedAt).toISOString(),
    stopped_at: new Date().toISOString(),
    pattern: session.pattern.label,
    typing_style: session.animated ? 'character' : 'instant',
    synthetic_additions: session.additions,
    synthetic_deletions: session.deletions,
    synthetic_steps: session.edits,
    elapsed_wall_clock_seconds: Math.floor((Date.now() - session.startedAt) / 1000),
    wakatime_verified: false
  };
  fs.writeFileSync(path.join(session.folder, 'session-report.json'), JSON.stringify(report, null, 2) + '\n');
}
function stopSession(message = 'Session stopped.', quiet = false) {
  if (!active) return;
  const previous = active;
  if (!previous.running) return previous.closing;
  previous.running = false;
  clearInterval(previous.editTimer);
  clearInterval(previous.statusTimer);
  previous.closing = Promise.resolve(previous.pending).then(() => {
    active = null;
    try { writeReport(previous); } catch (error) {
      void vscode.window.showWarningMessage(`Activity Lab could not save the report. ${error.message}`);
    }
    formatStatus();
    if (!quiet) void vscode.window.showInformationMessage(`${message} Local changes: +${previous.additions} / −${previous.deletions} in ${previous.edits} steps. Report folder: ${previous.folder}`);
  });
  return previous.closing;
}
async function inputCustomLanguage(name = null) {
  const label = name || await vscode.window.showInputBox({ title: 'Custom language', prompt: 'Enter a language or file type', validateInput: v => v.trim().length ? undefined : 'Enter a name.' });
  if (!label) return null;
  const ext = await vscode.window.showInputBox({ title: 'File extension', prompt: 'Enter a file extension, such as .asm or .sql', value: '.txt', validateInput: v => /^\.[a-zA-Z0-9][a-zA-Z0-9._+-]{0,19}$/.test(v) ? undefined : 'Enter an extension such as .abc, without a slash.' });
  if (!ext) return null;
  const installed = vscode.languages?.getLanguages ? (await vscode.languages.getLanguages()) : ['plaintext'];
  const modes = [...new Set(['plaintext', ...installed])].sort().map(id => ({ label: id, id }));
  const picked = await vscode.window.showQuickPick(modes, { title: 'Editor grammar', placeHolder: 'Choose an installed VS Code language mode', matchOnDescription: true });
  if (!picked) return null;
  return { label: label.trim().slice(0, 80), id: picked.id, ext, category: 'Custom / online catalog', comment: 'hash' };
}
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 12000, headers: { 'Accept': 'application/json', 'User-Agent': 'ActivityLab/4.1' } }, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`WakaTime returned HTTP ${res.statusCode}`)); }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; if (body.length > 3_000_000) req.destroy(new Error('The catalog exceeded the response size limit.')); });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('The WakaTime language catalog timed out.')));
    req.on('error', reject);
  });
}
async function onlineLanguages() {
  if (verifiedCatalog) return verifiedCatalog;
  const names = new Map();
  const first = await fetchJson(ONLINE_URL + '?page=1');
  const pages = Number(first.total_pages || 1);
  if (!Number.isInteger(pages) || pages > CATALOG_PAGES_LIMIT) {
    throw new Error(`The online catalog exceeds the page limit (${pages} pages).`);
  }
  function add(response) {
    if (!Array.isArray(response.data)) throw new Error('WakaTime returned an unexpected catalog format.');
    for (const item of response.data) if (item?.name && item.is_verified !== false) names.set(item.name.toLowerCase(), item.name);
  }
  add(first);
  for (let page = 2; page <= pages; page++) add(await fetchJson(ONLINE_URL + `?page=${page}`));
  verifiedCatalog = [...names.values()].sort((a,b) => a.localeCompare(b));
  return verifiedCatalog;
}
async function pickLanguages(state) {
  const type = await vscode.window.showQuickPick([
    { label: '$(file-code) Single language', description: `${LANGUAGES.length} built-in profiles`, source: 'local' },
    { label: '$(checklist) Choose multiple language', description: 'Build a custom rotation', source: 'multiple' },
    { label: '$(bookmark) Saved Language', description: 'Open a saved preset', source: 'saved' },
    { label: '$(briefcase) Professional Modes', description: `${PROFESSIONAL_MODES.length} fields`, source: 'mode' },
    { label: '$(globe) WakaTime language catalog', description: 'Browse the online catalog', source: 'online' },
    { label: '$(settings-gear) Custom language', description: 'Set the file extension and grammar', source: 'custom' }
  ], { title: 'Activity Lab', placeHolder: 'Choose a language source' });
  if (!type) return null;
  if (type.source === 'saved') return pickSaved(state);
  if (type.source === 'mode') {
    const items = [];
    for (const category of new Set(PROFESSIONAL_MODES.map(mode => mode.category))) {
      items.push({ label: category, kind: vscode.QuickPickItemKind.Separator });
      for (const mode of PROFESSIONAL_MODES.filter(mode => mode.category === category)) {
        items.push({
          label: `$(${mode.icon}) ${mode.title}`,
          description: mode.profiles.map(profile => profile.label).join(', '),
          detail: `${mode.summary} (${mode.category})`,
          mode
        });
      }
    }
    const chosen = await vscode.window.showQuickPick(items, {
      title: 'Professional Modes', placeHolder: 'Search by role or language',
      matchOnDescription: true, matchOnDetail: true
    });
    return chosen ? { languages: chosen.mode.profiles, mode: chosen.mode.title } : null;
  }
  if (type.source === 'custom') {
    const choice = await inputCustomLanguage();
    return choice ? { languages: [choice], mode: 'Custom language' } : null;
  }
  if (type.source === 'online') {
    try {
      const names = await onlineLanguages();
      const picked = await vscode.window.showQuickPick(names.map(label => ({ label, description: byName.has(label.toLowerCase()) ? 'Built-in profile' : 'Choose a file extension' })), { title: 'WakaTime language catalog', placeHolder: `Search ${names.length} languages`, matchOnDescription: true });
      if (!picked) return null;
      const known = byName.get(picked.label.toLowerCase());
      if (known) return { languages: [known], mode: 'WakaTime language' };
      const custom = await inputCustomLanguage(picked.label);
      return custom ? { languages: [custom], mode: 'Custom catalog language' } : null;
    } catch (error) {
      void vscode.window.showWarningMessage(`Could not load the WakaTime catalog. ${error.message} Built-in profiles are available offline.`);
      return null;
    }
  }
  const multiple = type.source === 'multiple';
  const items = LANGUAGES.map(profile => ({ label: profile.label, description: profile.category, detail: profile.ext, data: profile }));
  const picked = await vscode.window.showQuickPick(items, {
    title: multiple ? 'Choose multiple language' : 'Single language',
    placeHolder: multiple ? 'Select profiles, then press Enter' : 'Choose a language or file format',
    canPickMany: multiple, matchOnDescription: true, matchOnDetail: true
  });
  if (!multiple) return picked ? { languages: [picked.data], mode: 'Single language' } : null;
  if (!picked?.length) return null;
  const languages = picked.map(item => item.data);
  if (languages.length === 1) return { languages, mode: 'Single language' };
  const action = await vscode.window.showQuickPick(['Use once', 'Save preset'], { title: 'Language selection', placeHolder: 'Use this selection once or give it a name' });
  if (!action) return null;
  if (action === 'Save preset') {
    const name = await vscode.window.showInputBox({
      title: 'Save preset', prompt: 'Enter a name for this selection',
      validateInput: value => !value.trim() ? 'Enter a preset name.' :
        state.get('languagePresets', []).some(p => p.name.toLowerCase() === value.trim().toLowerCase()) ? 'A preset already has that name.' : undefined
    });
    if (!name?.trim()) return null;
    const preset = { name: name.trim(), languages: languages.map(language => language.label) };
    await state.update('languagePresets', [...state.get('languagePresets', []), preset]);
  }
  return { languages, mode: 'Multiple languages', shuffle: true };
}
async function pickSaved(state) {
  const presets = state.get('languagePresets', []);
  if (!presets.length) {
    void vscode.window.showInformationMessage('No presets yet. Save a selection from “Choose multiple language” first.');
    return null;
  }
  const picked = await vscode.window.showQuickPick(presets.map(preset => ({
    label: preset.name, detail: preset.languages.join(', '), preset
  })), { title: 'Saved Language', placeHolder: 'Choose a preset', matchOnDetail: true });
  if (!picked) return null;
  const action = await vscode.window.showQuickPick(['Use preset', 'Delete preset'], { title: picked.label });
  if (action === 'Delete preset') {
    const confirm = await vscode.window.showWarningMessage('Delete the preset “' + picked.label + '”?', { modal: true }, 'Delete');
    if (confirm === 'Delete') await state.update('languagePresets', state.get('languagePresets', []).filter(p => p.name !== picked.label));
    return null;
  }
  if (!action) return null;
  const languages = picked.preset.languages.map(label => byName.get(label.toLowerCase()));
  if (languages.some(language => !language)) {
    void vscode.window.showWarningMessage('This preset contains a profile that is no longer available.');
    return null;
  }
  return { languages, mode: picked.label, shuffle: true };
}
async function pickProjectName() {
  const name = await vscode.window.showInputBox({
    title: 'Project name',
    prompt: 'Leave blank to use Activity Lab. Each session records this name in .wakatime-project.',
    placeHolder: 'Example: Analytics research',
    value: '',
    validateInput: validateProjectName
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
    { label: 'Custom duration', custom: true },
    { label: 'Until stopped', minutes: null }
  ];
  const picked = await vscode.window.showQuickPick(durations, { title: 'Session duration', placeHolder: 'Choose a time limit or stop the session yourself' });
  if (!picked) return undefined;
  if (!picked.custom) return picked.minutes;
  const value = await vscode.window.showInputBox({ title: 'Custom duration', prompt: 'Enter a duration in minutes (1 to 480)', value: '180', validateInput: s => /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= 480 ? undefined : 'Enter a whole number from 1 to 480.' });
  return value ? Number(value) : undefined;
}
async function pickPattern() {
  const options = Object.values(PATTERNS).map(pattern => ({
    label: pattern.label,
    description: pattern.description,
    data: pattern
  }));
  const picked = await vscode.window.showQuickPick(options, {
    title: 'Edit pattern', placeHolder: 'Choose how many lines each step adds and removes'
  });
  return picked?.data || null;
}
async function startSession(state) {
  if (active) {
    void vscode.window.showWarningMessage('Stop the current session before starting another.');
    return;
  }
  const choice = await pickLanguages(state);
  if (!choice?.languages?.length) return;
  const selected = choice.languages;
  const project = await pickProjectName();
  if (project === undefined) return;
  const minutes = await pickDuration();
  if (minutes === undefined) return;
  const pattern = await pickPattern();
  if (!pattern) return;
  const interval = await vscode.window.showQuickPick([15,30,60,120].map(seconds => ({ label: `${seconds} seconds`, seconds })), { title: 'Edit interval', placeHolder: 'Choose the time between editing steps' });
  if (!interval) return;
  const typing = await vscode.window.showQuickPick([
    { label: 'Instant', description: 'Apply each batch in one edit', animated: false },
    { label: 'Character by character', description: 'Type each sample with short pauses', animated: true }
  ], { title: 'Typing style', placeHolder: 'Choose how the code appears' });
  if (!typing) return;
  const confirm = await vscode.window.showWarningMessage(
    'Start this Activity Lab session?',
    { modal: true, detail: [
      `Project: ${project}`, `Mode: ${choice.mode}`, `Profiles: ${selected.length}`,
      `Duration: ${minutes === null ? 'Until stopped' : `${minutes} min`}`,
      `Pattern: ${pattern.label}`, `Interval: ${interval.seconds} seconds`, `Typing: ${typing.label}`,
      'Activity Lab generates local test edits. External trackers decide which edits they count.'
    ].join('\n') }, 'Start session'
  );
  if (confirm !== 'Start session') return;

  try {
    fs.mkdirSync(ROOT, { recursive: true });
    if (fs.lstatSync(ROOT).isSymbolicLink()) throw new Error('The session folder cannot be a symbolic link.');
    // Each session can override the default project marker.
    fs.writeFileSync(path.join(ROOT, '.wakatime-project'), DEFAULT_PROJECT + '\n');
    const folder = path.join(ROOT, `session-${new Date().toISOString().replace(/[:.]/g,'-')}-${require('node:crypto').randomBytes(3).toString('hex')}`);
    fs.mkdirSync(folder, { recursive: false });
    fs.writeFileSync(path.join(folder, '.wakatime-project'), project + '\n');
    fs.writeFileSync(path.join(folder, 'ABOUT_THIS_SESSION.txt'), 'Activity Lab\n\nThese files contain generated samples for a local editor test.\n© Albatany 2026\n');
    const files = {};
    const reserved = new Set();
    const langs = selected.map((lang, index) => ({ ...lang, key: `${index}` }));
    for (const lang of langs) {
      const [opening, footer] = frameFor(lang);
      const header = headerFor(lang) + opening;
      const fileName = buildFileName(lang, reserved);
      const file = path.join(folder, fileName);
      const json = isJson(lang);
      const initial = json ? renderJson([]) : header + footer;
      fs.writeFileSync(file, initial, { flag: 'wx', encoding: 'utf8' });
      files[lang.key] = { uri: vscode.Uri.file(file), fileName, header, footer, json, records: [], units: 0, bytes: Buffer.byteLength(initial) };
    }
    if (langs.length === 1 && !typing.animated) await showLanguageFile(langs[0], files[langs[0].key].uri);
    const startedAt = Date.now();
    const session = {
      folder, project, mode: choice.mode, languages: langs, files, currentLanguage: null, startedAt, pattern,
      shuffle: choice.shuffle, round: [], animated: typing.animated,
      endsAt: minutes === null ? null : startedAt + minutes*60*1000,
      running: true, pending: null, tick: 0, edits: 0, additions: 0, deletions: 0, sequence: 0,
      totalBytes: langs.reduce((n, lang) => n + files[lang.key].bytes, 0),
      editTimer: null, statusTimer: null
    };
    active = session;
    formatStatus();
    session.editTimer = setInterval(() => scheduleStep(session), interval.seconds * 1000);
    session.statusTimer = setInterval(() => {
      if (session.endsAt !== null && Date.now() >= session.endsAt) stopSession('Session time limit reached.');
      else formatStatus();
    }, 10000);
    void scheduleStep(session);
    void vscode.window.showInformationMessage(`Activity Lab started for ${project}. Session folder: ${folder}`);
  } catch (error) {
    if (active?.running) stopSession('Setup error.');
    void vscode.window.showErrorMessage(`Activity Lab could not start. ${error.message}`);
  }
}
function showStatus() {
  if (!active?.running) return void vscode.window.showInformationMessage('Activity Lab has no active session.');
  const s = active;
  void vscode.window.showInformationMessage('Activity Lab session', {
    modal: true, detail: `${sessionDetails(s)}\nFolder: ${s.folder}`
  });
}
function activate(context) {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBar);
  let choosing = false;
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.start', async () => {
    if (choosing) return;
    choosing = true;
    try { await startSession(context.globalState); }
    catch (error) { void vscode.window.showErrorMessage('Activity Lab could not open the session. ' + error.message); }
    finally { choosing = false; }
  }));
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.stop', () => active ? stopSession() : showStatus()));
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.status', showStatus));
  formatStatus();
}
function deactivate() {
  return stopSession('Extension closed.', true);
}
module.exports = { activate, deactivate };
