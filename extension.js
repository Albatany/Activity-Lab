'use strict';

// Activity Lab is a standalone local editor-simulation tool.
const vscode = require('vscode');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const LANGUAGES = require('./languages.json');
const { PATTERNS, buildPlan } = require('./linePatterns');
const { MODES, resolveModes } = require('./modes');
const { buildFileName } = require('./fileNaming');
const { MAX_SELECTED_LANGUAGES, LAST_SELECTED_KEY, normalizeProfiles, validatePresetName, readPresets, savePreset, deletePreset, renamePreset, buildQuickPickItems } = require('./languageSelection');
const { createSessionClock } = require('./sessionClock');
const { version: VERSION } = require('./package.json');

const ROOT = path.join(os.homedir(), '.vscode-activity-lab');
const PROFESSIONAL_MODES = resolveModes(MODES, LANGUAGES);
const MAX_FILE_BYTES = 2_000_000;
const MAX_SESSION_BYTES = 10_000_000;
const byName = new Map(LANGUAGES.map(l => [l.label.toLowerCase(), l]));

let active = null;
let statusBar = null;
let extensionState = null;
let configuring = false;
let setupGeneration = 0;
let presetManagerOpen = false;
let lastFolder = null;

function formatElapsed(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function formatStatus() {
  if (!statusBar) return;
  if (!active) {
    statusBar.text = '$(beaker) Activity Lab · Ready';
    statusBar.tooltip = 'Synthetic editor lab. Select to begin a new session.';
    statusBar.command = 'activityLab.start';
  } else {
    const s = active;
    const time = s.endsAt === null ? 'Until stopped' : `${Math.ceil(s.clock.remainingMs() / 60000)} min left`;
    const state = !s.running ? 'Stopping' : s.paused ? 'Paused' : 'Running';
    statusBar.text = `$(${s.paused ? 'debug-pause' : 'beaker'}) Lab · ${state} · +${s.additions} −${s.deletions} · ${time}`;
    statusBar.tooltip = `ACTIVITY LAB | LOCAL SESSION\nState: ${state}\nSelection: ${s.mode}\nLanguage: ${s.currentLanguage?.label || s.languages[0].label}\nTotal languages: ${s.languages.length}\nPattern: ${s.pattern.label}\nSynthetic changes: +${s.additions} / −${s.deletions}\nElapsed: ${formatElapsed(s.clock.elapsedMs())}\nStandalone local simulation\nSelect for session controls\n© Albatany 2026`;
    statusBar.command = 'activityLab.controls';
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
// Each generated record is a single placeholder line. All changes remain isolated
// to the Activity Lab scratch folder.
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
  if (!canEdit(session)) return false;
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
    // JSON is replaced as a serialized document to keep the scratch file valid.
    edit.replace(file.uri, fullRange(doc), nextText);
  } else {
    if (plan.remove) {
      const from = file.header.length;
      const through = from + toRemove.join('').length;
      edit.delete(file.uri, new vscode.Range(doc.positionAt(from), doc.positionAt(through)));
    }
    edit.insert(file.uri, doc.positionAt(current.length), newRecords.join(''));
  }
  if (!canEdit(session)) return false;
  if (!await vscode.workspace.applyEdit(edit)) throw new Error('VS Code rejected the scratch file edit.');
  const saved = await vscode.workspace.openTextDocument(file.uri);
  if (!await saved.save()) throw new Error('VS Code could not save the scratch file.');

  file.records = remaining;
  session.totalBytes += Buffer.byteLength(nextText,'utf8') - Buffer.byteLength(current,'utf8');
  session.additions += plan.add;
  session.deletions += plan.remove;
  session.edits += 1;
  return true;
}
async function showLanguageFile(language, uri) {
  let doc = await vscode.workspace.openTextDocument(uri);
  // File association can be ambiguous. If an installed VS Code grammar exists,
  // use it; syntax selection is best-effort.
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
function canEdit(session) {
  if (!session.running || active !== session || session.paused) return false;
  if (!session.clock.expired()) return true;
  void stopSession('Automatic session limit reached.');
  return false;
}
function doStep(session) {
  if (session.busy || !canEdit(session)) return session.stepPromise;
  session.busy = true;
  session.stepPromise = performStep(session).finally(() => { session.busy = false; });
  return session.stepPromise;
}
async function performStep(session) {
  try {
    const language = session.languages[session.tick % session.languages.length];
    const file = session.files[language.key];
    if (session.languages.length > 1) await showLanguageFile(language, file.uri);
    session.currentLanguage = language;
    if (!canEdit(session)) return;
    if (!await applyStep(session, file, language)) return;
    session.tick += 1;
    saveReport(session);
    formatStatus();
  } catch (error) {
    if (active === session) void stopSession('Stopped due to an editing error.');
    void vscode.window.showErrorMessage(`Activity Lab stopped: ${error.message}`);
  }
}
function writeReport(session) {
  const now = Date.now();
  const report = {
    type: 'LOCAL_SYNTHETIC_TEST_REPORT',
    extension_version: VERSION,
    session_state: session.stoppedAt !== null ? 'stopped' : session.paused ? 'paused' : 'running',
    note: 'Generated from local placeholder operations. This report describes Activity Lab simulation counters, not physical coding work.',
    simulated_mode: session.mode,
    selection_type: session.selectionType || 'curated',
    selected_languages: session.languages.map(language => language.label),
    files: session.languages.map(language => ({ language: language.label, name: session.files[language.key].fileName })),
    platform: process.platform,
    started_at: new Date(session.startedAt).toISOString(),
    updated_at: new Date(now).toISOString(),
    stopped_at: session.stoppedAt === null ? null : new Date(session.stoppedAt).toISOString(),
    scheduled_end_at: session.endsAt === null ? null : new Date(session.endsAt).toISOString(),
    stop_reason: session.stopReason || null,
    pause_count: session.pauseCount,
    paused_seconds: Math.floor((session.pausedMs + (session.pausedAt === null ? 0 : session.clock.elapsedMs() - session.pausedAt)) / 1000),
    pattern: session.pattern.label,
    synthetic_additions: session.additions,
    synthetic_deletions: session.deletions,
    synthetic_steps: session.edits,
    elapsed_wall_clock_seconds: Math.max(0, Math.floor((now - session.startedAt) / 1000))
  };
  const temporary = path.join(session.folder, `.session-report-${require('node:crypto').randomBytes(6).toString('hex')}.tmp`);
  try {
    fs.writeFileSync(temporary, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', encoding: 'utf8' });
    fs.renameSync(temporary, path.join(session.folder, 'session-report.json'));
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
function saveReport(session) {
  try { writeReport(session); session.reportErrorShown = false; }
  catch (error) {
    if (!session.reportErrorShown) void vscode.window.showWarningMessage(`Could not save the Activity Lab report: ${error.message}`);
    session.reportErrorShown = true;
  }
}
function stopSession(message = 'Synthetic session stopped.') {
  if (configuring) setupGeneration += 1;
  if (!active) return;
  const previous = active;
  if (previous.stopPromise) return previous.stopPromise;
  previous.running = false;
  clearInterval(previous.editTimer);
  clearInterval(previous.statusTimer);
  previous.stopReason = message;
  formatStatus();
  previous.stopPromise = (async () => {
    // An edit already handed to VS Code may finish; include it in the final report.
    await previous.stepPromise;
    previous.stoppedAt = Date.now();
    finishPause(previous);
    saveReport(previous);
    if (active === previous) active = null;
    formatStatus();
    void vscode.window.showInformationMessage(`${message} Local synthetic changes: +${previous.additions} / −${previous.deletions}; ${previous.edits} steps over ${formatElapsed(previous.clock.elapsedMs())}. Report: ${previous.folder}`);
  })();
  return previous.stopPromise;
}
function finishPause(session) {
  if (session.pausedAt !== null) session.pausedMs += session.clock.elapsedMs() - session.pausedAt;
  session.pausedAt = null;
}
async function pauseSession() {
  const session = active;
  if (!session?.running || session.paused) return;
  if (session.clock.expired()) return stopSession('Session time limit reached.');
  session.paused = true;
  session.pausedAt = session.clock.elapsedMs();
  session.pauseCount += 1;
  formatStatus();
  await session.stepPromise;
  if (active === session && session.running) saveReport(session);
}
function resumeSession() {
  const session = active;
  if (!session?.running || !session.paused) return;
  if (session.clock.expired()) return stopSession('Session time limit reached.');
  finishPause(session);
  session.paused = false;
  saveReport(session);
  formatStatus();
  return doStep(session);
}
async function openReport() {
  const folder = active?.folder || lastFolder;
  if (!folder) return void vscode.window.showInformationMessage('Start a session first to create a local report.');
  try {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(folder, 'session-report.json')));
    await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: false });
  } catch (error) { void vscode.window.showWarningMessage(`Could not open the session report: ${error.message}`); }
}
async function showControls() {
  const session = active;
  if (!session) return startSession();
  const choice = await vscode.window.showQuickPick([
    { label: session.paused ? 'Resume simulation' : 'Pause simulation', action: session.paused ? 'resume' : 'pause' },
    { label: 'Session status', action: 'status' },
    { label: 'Open session report', action: 'report' },
    { label: 'Stop simulation', action: 'stop' }
  ], { title: 'Activity Lab | Session controls', placeHolder: 'Paused time counts toward the scheduled end time.' });
  if (!choice || active !== session) return;
  return ({ pause: pauseSession, resume: resumeSession, status: showStatus, report: openReport, stop: stopSession })[choice.action]();
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
    title: 'VS Code syntax mode', placeHolder: 'Choose the syntax mode used to display this file in VS Code.'
  });
  if (!picked) return null;
  return { label: label.trim().slice(0, 80), id: picked.id, ext, category: 'Custom file profile', comment: 'hash' };
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
      validateInput: text => validatePresetName(text) || undefined
    });
    if (name === undefined) return false;
    try {
      const existing = readPresets(extensionState, LANGUAGES).find(entry => entry.name.toLowerCase() === name.trim().toLowerCase());
      if (existing) {
        const replace = await vscode.window.showWarningMessage(`Replace the languages in "${existing.name}"?`, { modal: true }, 'Replace preset');
        if (replace !== 'Replace preset') return false;
      }
      await savePreset(extensionState, LANGUAGES, name, profiles);
      void vscode.window.showInformationMessage(`Saved language preset: ${name.trim()}`);
    } catch (error) {
      void vscode.window.showWarningMessage(`Could not save preset: ${error.message}`);
      return false;
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
  if (presetManagerOpen) return;
  presetManagerOpen = true;
  try { await editPreset(); }
  catch (error) { void vscode.window.showWarningMessage(`Could not update Saved Languages: ${error.message}`); }
  finally { presetManagerOpen = false; }
}
async function editPreset() {
  const saved = readPresets(extensionState, LANGUAGES);
  if (!saved.length) return void vscode.window.showInformationMessage('No saved language presets to manage.');
  const chosen = await vscode.window.showQuickPick(saved.map(entry => ({
    label: entry.name, description: `${entry.languages.length} languages`, detail: entry.languages.join(', '), entry
  })), { title: 'Saved Languages', placeHolder: 'Choose a preset to rename, edit, or delete', matchOnDetail: true });
  if (!chosen) return;
  const action = await vscode.window.showQuickPick([
    { label: 'Rename preset', action: 'rename' },
    { label: 'Edit languages', action: 'edit' },
    { label: 'Delete preset', action: 'delete' }
  ], { title: chosen.entry.name });
  if (!action) return;
  if (action.action === 'rename') {
    const name = await vscode.window.showInputBox({
      title: 'Rename language preset', value: chosen.entry.name,
      validateInput: text => validatePresetName(text) || undefined
    });
    if (name === undefined) return;
    await renamePreset(extensionState, LANGUAGES, chosen.entry.name, name);
    void vscode.window.showInformationMessage(`Renamed preset: ${name.trim()}`);
    return;
  }
  if (action.action === 'edit') {
    const selected = await vscode.window.showQuickPick(buildQuickPickItems(LANGUAGES, chosen.entry.languages), {
      title: 'Edit saved languages', placeHolder: `Select up to ${MAX_SELECTED_LANGUAGES} languages`,
      canPickMany: true, matchOnDescription: true, matchOnDetail: true, ignoreFocusOut: true
    });
    if (!selected) return;
    const profiles = normalizeProfiles(selected.map(item => item.profile), LANGUAGES);
    const answer = await vscode.window.showWarningMessage(`Replace the languages in "${chosen.entry.name}"?`, { modal: true }, 'Replace preset');
    if (answer !== 'Replace preset') return;
    await savePreset(extensionState, LANGUAGES, chosen.entry.name, profiles);
    void vscode.window.showInformationMessage(`Updated preset: ${chosen.entry.name}`);
    return;
  }
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
    { label: '$(bookmark) Saved Languages', description: 'Reuse a selection you created earlier', kind: 'presets' },
    { label: '$(code) Single language', description: 'One language or file profile', kind: 'local' },
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
  const choice = await vscode.window.showQuickPick(LANGUAGES.map(item => ({
    label: item.label, description: `${item.category} · ${item.ext}`, data: item
  })), { title: 'Single language', placeHolder: `Search ${LANGUAGES.length} built-in profiles`, matchOnDescription: true });
  return choice ? { languages: [choice.data], mode: 'Single Language', selectionType: 'single' } : null;
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
  })), { title: 'Synthetic line change pattern', placeHolder: 'Local simulation counters' });
  return picked?.data || null;
}
async function startSession() {
  if (active || configuring) {
    void vscode.window.showWarningMessage('A session is already running or being configured. Finish or stop it before starting another one.');
    return;
  }
  configuring = true;
  const generation = ++setupGeneration;
  try { await configureSession(generation); }
  catch (error) { void vscode.window.showErrorMessage(`Could not configure Activity Lab: ${error.message}`); }
  finally { configuring = false; }
}
async function configureSession(generation) {
  const choice = await pickLanguages();
  if (!choice?.languages?.length) return;
  const selected = choice.languages;
  if (selected.length > MAX_SELECTED_LANGUAGES) {
    void vscode.window.showWarningMessage(`Select up to ${MAX_SELECTED_LANGUAGES} languages per session.`);
    return;
  }
  const minutes = await pickDuration();
  if (minutes === undefined) return;
  const pattern = await pickPattern();
  if (!pattern) return;
  const interval = await vscode.window.showQuickPick([15,30,60,120].map(seconds => ({ label: `${seconds} seconds`, description: 'Pause between edits', seconds })), { title: 'Edit interval', placeHolder: 'How often should the sandbox file change?' });
  if (!interval) return;
  const confirm = await vscode.window.showWarningMessage(
    `This session generates synthetic editor changes in an isolated local sandbox. It does not represent actual coding work.\n\nSelection: ${choice.mode}\nLanguages: ${selected.length}\nDuration: ${minutes === null ? 'Until I stop' : `${minutes} minutes`}\nPattern: ${pattern.label}`,
    { modal: true }, 'Start simulation'
  );
  if (confirm !== 'Start simulation' || generation !== setupGeneration) return;

  try {
    fs.mkdirSync(ROOT, { recursive: true });
    if (fs.lstatSync(ROOT).isSymbolicLink()) throw new Error('The simulation root folder cannot be a symbolic link.');
    const folder = path.join(ROOT, `session-${new Date().toISOString().replace(/[:.]/g,'-')}-${require('node:crypto').randomBytes(3).toString('hex')}`);
    fs.mkdirSync(folder, { recursive: false });
    fs.writeFileSync(path.join(folder, 'ABOUT_SIMULATION.txt'), 'Activity Lab by Albatany\n\nThis folder contains local synthetic test files. It does not represent real coding work or professional experience.\nNo external activity-tracking service is contacted by Activity Lab.\n© Albatany 2026\n');
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
    if (generation !== setupGeneration) return;
    const clock = createSessionClock(minutes);
    const startedAt = clock.startedAt;
    const session = {
      folder, mode: choice.mode, selectionType: choice.selectionType, languages: langs, files, currentLanguage: langs[0], startedAt, pattern,
      clock, endsAt: clock.endsAt, stoppedAt: null, stopReason: null,
      paused: false, pauseCount: 0, pausedMs: 0, pausedAt: null,
      running: true, busy: false, tick: 0, edits: 0, additions: 0, deletions: 0, sequence: 0,
      totalBytes: langs.reduce((n, lang) => n + Buffer.byteLength(lang.comment === 'json' ? renderJson([]) : headerFor(lang), 'utf8'), 0),
      editTimer: null, statusTimer: null, stepPromise: null, stopPromise: null
    };
    active = session;
    lastFolder = folder;
    saveReport(session);
    formatStatus();
    session.editTimer = setInterval(() => doStep(session), interval.seconds * 1000);
    session.statusTimer = setInterval(() => {
      if (active !== session || !session.running) return;
      if (session.clock.expired()) return stopSession('Session time limit reached.');
      else formatStatus();
    }, 10000);
    void doStep(session);
    void vscode.window.showInformationMessage(`Activity Lab started. Sandbox: ${folder}`);
  } catch (error) {
    if (active?.running) await stopSession('Setup error.');
    void vscode.window.showErrorMessage(`Could not start Activity Lab: ${error.message}`);
  }
}
function showStatus() {
  if (!active?.running) return void vscode.window.showInformationMessage('Activity Lab is not currently running a session.');
  const s = active;
  const limit = s.endsAt === null ? 'Until manually stopped' : `${Math.ceil(s.clock.remainingMs()/60000)} minutes remaining`;
  void vscode.window.showInformationMessage(`Local simulation · ${s.paused ? 'Paused' : 'Running'} · ${s.mode} · ${s.languages.length} languages · +${s.additions} / −${s.deletions} records · ${s.edits} steps · ${formatElapsed(s.clock.elapsedMs())} · ${limit}. Folder: ${s.folder}`);
}
function activate(context) {
  extensionState = context.globalState || null;
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBar);
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.start', startSession));
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.stop', () => active || configuring ? stopSession() : showStatus()));
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.pause', pauseSession));
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.resume', resumeSession));
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.controls', showControls));
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.report', openReport));
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.status', showStatus));
  context.subscriptions.push(vscode.commands.registerCommand('activityLab.presets', managePresets));
  formatStatus();
}
function deactivate() {
  setupGeneration += 1;
  return stopSession('Extension deactivated.');
}
module.exports = { activate, deactivate };
