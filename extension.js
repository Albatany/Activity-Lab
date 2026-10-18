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

function formatElapsed(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function formatStatus() {
  if (!statusBar) return;
  if (!active?.running) {
    statusBar.text = '$(beaker) Activity Lab  •  Siap';
    statusBar.tooltip = 'Simulator editor. Klik untuk memulai sesi baru.';
    statusBar.command = 'activityLab.start';
  } else {
    const s = active;
    const time = s.endsAt === null ? 'Sampai dihentikan' : `${Math.max(0, Math.ceil((s.endsAt - Date.now()) / 60000))} menit lagi`;
    statusBar.text = `$(beaker) Simulasi  +${s.additions}  −${s.deletions}  •  ${time}`;
    statusBar.tooltip = `ACTIVITY LAB  |  SIMULASI LOKAL\nProyek: ${s.project}\nMode: ${s.mode}\nBahasa: ${s.currentLanguage?.label || s.languages[0].label}\nRasio: ${s.pattern.label}\nPerubahan lokal: +${s.additions} / −${s.deletions}\nDurasi berjalan: ${formatElapsed(Date.now()-s.startedAt)}\nTidak sama dengan statistik WakaTime\nKlik untuk menghentikan\n© Albatany 2026`;
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
  if (current !== expected) throw new Error('File percobaan diubah secara manual. Sesi dihentikan untuk melindungi perubahanmu.');

  const plan = buildPlan(session.pattern, file.records.length);
  const toRemove = file.records.slice(0, plan.remove);
  const newRecords = Array.from({ length: plan.add }, (_, index) => recordFor(language, ++session.sequence));
  const remaining = file.records.slice(plan.remove).concat(newRecords);
  const nextText = file.json ? renderJson(remaining) : file.header + remaining.join('');
  if (Buffer.byteLength(nextText, 'utf8') > MAX_FILE_BYTES ||
      session.totalBytes - Buffer.byteLength(current,'utf8') + Buffer.byteLength(nextText,'utf8') > MAX_SESSION_BYTES) {
    throw new Error('Batas aman tercapai: 2 MB per file atau 10 MB per sesi. Hapus sesi percobaan lama jika tidak diperlukan.');
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
  if (!await vscode.workspace.applyEdit(edit)) throw new Error('VS Code menolak perubahan file percobaan.');
  const saved = await vscode.workspace.openTextDocument(file.uri);
  if (!await saved.save()) throw new Error('VS Code tidak dapat menyimpan file percobaan.');

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
    void vscode.window.showErrorMessage(`Activity Lab berhenti: ${error.message}`);
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
    void vscode.window.showWarningMessage(`Laporan Activity Lab gagal disimpan: ${error.message}`);
  }
  formatStatus();
  void vscode.window.showInformationMessage(`Sesi berakhir. Perubahan simulasi +${previous.additions} / −${previous.deletions}, ${previous.edits} langkah selama ${formatElapsed(Date.now()-previous.startedAt)}. Statistik WakaTime belum diverifikasi. Laporan: ${previous.folder}`);
}
async function inputCustomLanguage(name = null) {
  const label = name || await vscode.window.showInputBox({ prompt: 'Nama bahasa atau jenis file', validateInput: v => v.trim().length ? undefined : 'Masukkan nama' });
  if (!label) return null;
  const ext = await vscode.window.showInputBox({ prompt: 'Ekstensi file, misalnya .asm, .sql, .md, atau .myext', value: '.txt', validateInput: v => /^\.[a-zA-Z0-9][a-zA-Z0-9._+-]{0,19}$/.test(v) ? undefined : 'Gunakan ekstensi aman seperti .abc tanpa garis miring' });
  if (!ext) return null;
  const installed = vscode.languages?.getLanguages ? (await vscode.languages.getLanguages()) : ['plaintext'];
  const modes = [...new Set(['plaintext', ...installed])].sort().map(id => ({ label: id, id }));
  const picked = await vscode.window.showQuickPick(modes, { placeHolder: 'Pilih bahasa yang terpasang di VS Code. Plain Text mungkin dianggap Other oleh WakaTime.', matchOnDescription: true });
  if (!picked) return null;
  return { label: label.trim().slice(0, 80), id: picked.id, ext, category: 'Custom / online catalog', comment: 'hash' };
}
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 12000, headers: { 'Accept': 'application/json', 'User-Agent': 'ActivityLab/4.0 (verified languages only)' } }, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`WakaTime returned HTTP ${res.statusCode}`)); }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; if (body.length > 3_000_000) req.destroy(new Error('Respons katalog terlalu besar')); });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('API bahasa WakaTime tidak merespons')));
    req.on('error', reject);
  });
}
async function onlineLanguages() {
  if (verifiedCatalog) return verifiedCatalog;
  const names = new Map();
  const first = await fetchJson(ONLINE_URL + '?page=1');
  const pages = Number(first.total_pages || 1);
  if (!Number.isInteger(pages) || pages > CATALOG_PAGES_LIMIT) {
    throw new Error(`Katalog online terlalu besar (${pages} halaman). Gunakan daftar bahasa bawaan.`);
  }
  function add(response) {
    if (!Array.isArray(response.data)) throw new Error('Format respons API WakaTime tidak sesuai');
    for (const item of response.data) if (item?.name && item.is_verified !== false) names.set(item.name.toLowerCase(), item.name);
  }
  add(first);
  for (let page = 2; page <= pages; page++) add(await fetchJson(ONLINE_URL + `?page=${page}`));
  verifiedCatalog = [...names.values()].sort((a,b) => a.localeCompare(b));
  return verifiedCatalog;
}
async function pickLanguages() {
  const type = await vscode.window.showQuickPick([
    { label: '$(code) Bahasa tunggal', description: `${LANGUAGES.length} profil file sudah disediakan`, kind: 'local' },
    { label: '$(layers) Mode profesi', description: `${PROFESSIONAL_MODES.length} pilihan bidang teknologi`, kind: 'mode' },
    { label: '$(cloud-download) Katalog bahasa WakaTime', description: 'Ambil daftar resmi melalui internet jika diperlukan', kind: 'online' },
    { label: '$(settings-gear) Bahasa kustom', description: 'Tentukan ekstensi file dan mode VS Code', kind: 'custom' }
  ], { title: 'Activity Lab  |  Pilih jenis simulasi', placeHolder: 'Pilih satu bahasa atau beberapa bahasa berdasarkan bidang' });
  if (!type) return null;
  if (type.kind === 'mode') {
    const chosen = await vscode.window.showQuickPick(PROFESSIONAL_MODES.map(mode => ({
      label: mode.title,
      description: mode.category,
      detail: `${mode.summary}  •  ${mode.profiles.length} bahasa`,
      mode
    })), { title: 'Mode Profesi', placeHolder: 'Ketik nama bidang untuk mencari', matchOnDescription: true, matchOnDetail: true });
    return chosen ? { languages: chosen.mode.profiles, mode: chosen.mode.title } : null;
  }
  if (type.kind === 'custom') {
    const choice = await inputCustomLanguage();
    return choice ? { languages: [choice], mode: 'Bahasa Kustom' } : null;
  }
  if (type.kind === 'online') {
    try {
      const names = await onlineLanguages();
      const picked = await vscode.window.showQuickPick(names.map(label => ({ label, description: byName.has(label.toLowerCase()) ? 'Profil tersedia' : 'Perlu pengaturan ekstensi file' })), { title: 'Katalog Bahasa WakaTime', placeHolder: `Cari dalam ${names.length} bahasa`, matchOnDescription: true });
      if (!picked) return null;
      const known = byName.get(picked.label.toLowerCase());
      if (known) return { languages: [known], mode: 'Bahasa WakaTime' };
      const custom = await inputCustomLanguage(picked.label);
      return custom ? { languages: [custom], mode: 'Bahasa WakaTime Kustom' } : null;
    } catch (error) {
      void vscode.window.showWarningMessage(`Katalog WakaTime tidak tersedia: ${error.message}. Gunakan daftar bawaan.`);
      return null;
    }
  }
  const choice = await vscode.window.showQuickPick(LANGUAGES.map(item => ({ label: item.label, description: `${item.category}  •  ${item.ext}`, data: item })), { title: 'Pilih Bahasa', placeHolder: `Tersedia ${LANGUAGES.length} profil`, matchOnDescription: true });
  return choice ? { languages: [choice.data], mode: 'Bahasa Tunggal' } : null;
}
async function pickProjectName() {
  const name = await vscode.window.showInputBox({
    title: 'Nama Proyek  |  Opsional',
    prompt: 'Nama dapat dikenali WakaTime melalui file .wakatime-project. Tidak menjamin statistik tercatat.',
    placeHolder: 'Contoh: Riset Analitik 2026',
    value: '',
    validateInput: validateProjectName
  });
  if (name === undefined) return undefined;
  return name.trim() || DEFAULT_PROJECT;
}
async function pickDuration() {
  const durations = [
    { label: '5 menit', minutes: 5 },
    { label: '15 menit', minutes: 15 },
    { label: '30 menit', minutes: 30 },
    { label: '1 jam', minutes: 60 },
    { label: '2 jam', minutes: 120 },
    { label: '4 jam', minutes: 240 },
    { label: '6 jam', minutes: 360 },
    { label: '8 jam', minutes: 480 },
    { label: 'Atur sendiri (maksimal 8 jam)', custom: true },
    { label: 'Jalankan sampai saya hentikan', minutes: null }
  ];
  const picked = await vscode.window.showQuickPick(durations, { title: 'Durasi Simulasi', placeHolder: 'Pilih waktu maksimal 8 jam atau berhenti secara manual' });
  if (!picked) return undefined;
  if (!picked.custom) return picked.minutes;
  const value = await vscode.window.showInputBox({ prompt: 'Masukkan durasi dalam menit (1 sampai 480)', value: '180', validateInput: s => /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= 480 ? undefined : 'Masukkan angka bulat dari 1 sampai 480' });
  return value ? Number(value) : undefined;
}
async function pickPattern() {
  const options = Object.values(PATTERNS).map(pattern => ({
    label: pattern.label,
    description: pattern.description,
    data: pattern
  }));
  const picked = await vscode.window.showQuickPick(options, {
    title: 'Pola Perubahan Baris', placeHolder: 'Penghitung lokal saja, bukan hasil dari WakaTime'
  });
  return picked?.data || null;
}
async function startSession() {
  if (active?.running) {
    void vscode.window.showWarningMessage('Simulasi masih berjalan. Hentikan sesi sebelumnya untuk memulai sesi baru.');
    return;
  }
  const choice = await pickLanguages();
  if (!choice?.languages?.length) return;
  const selected = choice.languages;
  const project = await pickProjectName();
  if (project === undefined) return;
  const minutes = await pickDuration();
  if (minutes === undefined) return;
  const pattern = await pickPattern();
  if (!pattern) return;
  const interval = await vscode.window.showQuickPick([15,30,60,120].map(seconds => ({ label: `${seconds} detik`, description: 'Jeda antarperubahan', seconds })), { title: 'Interval', placeHolder: 'Seberapa sering file percobaan diubah?' });
  if (!interval) return;
  const confirm = await vscode.window.showWarningMessage(
    `Ini adalah simulasi perubahan file, bukan pekerjaan coding sungguhan. Statistik WakaTime dan extension lain tidak dijamin.\n\nProyek: ${project}\nBidang: ${choice.mode}\nBahasa: ${selected.length}\nDurasi: ${minutes === null ? 'Sampai dihentikan' : `${minutes} menit`}\nRasio: ${pattern.label}`,
    { modal: true }, 'Mulai simulasi'
  );
  if (confirm !== 'Mulai simulasi') return;

  try {
    fs.mkdirSync(ROOT, { recursive: true });
    if (fs.lstatSync(ROOT).isSymbolicLink()) throw new Error('Folder simulasi tidak boleh berupa symbolic link.');
    // Keep the root explicitly synthetic; each session has its own project override.
    fs.writeFileSync(path.join(ROOT, '.wakatime-project'), DEFAULT_PROJECT + '\n');
    const folder = path.join(ROOT, `session-${new Date().toISOString().replace(/[:.]/g,'-')}-${require('node:crypto').randomBytes(3).toString('hex')}`);
    fs.mkdirSync(folder, { recursive: false });
    fs.writeFileSync(path.join(folder, '.wakatime-project'), project + '\n');
    fs.writeFileSync(path.join(folder, 'TENTANG_SIMULASI.txt'), 'Activity Lab by Albatany\n\nIni adalah file percobaan otomatis. Bukan hasil kerja coding nyata atau bukti pengalaman profesional.\n© Albatany 2026\n');
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
      folder, project, mode: choice.mode, languages: langs, files, currentLanguage: langs[0], startedAt, pattern,
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
    void vscode.window.showInformationMessage(`Simulasi Activity Lab dimulai. Proyek: ${project}. File disimpan di ${folder}`);
  } catch (error) {
    if (active?.running) stopSession('Setup error.');
    void vscode.window.showErrorMessage(`Activity Lab tidak dapat dimulai: ${error.message}`);
  }
}
function showStatus() {
  if (!active?.running) return void vscode.window.showInformationMessage('Activity Lab tidak sedang menjalankan simulasi.');
  const s = active;
  const limit = s.endsAt === null ? 'Sampai dihentikan secara manual' : `${Math.max(0, Math.ceil((s.endsAt-Date.now())/60000))} menit tersisa`;
  void vscode.window.showInformationMessage(`Simulasi lokal • ${s.project} • ${s.mode} • +${s.additions} / −${s.deletions} baris • ${s.edits} langkah • ${formatElapsed(Date.now()-s.startedAt)} • ${limit}. Statistik WakaTime belum diverifikasi. Lokasi: ${s.folder}`);
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
    const previous = active;
    previous.running = false;
    clearInterval(previous.editTimer);
    clearInterval(previous.statusTimer);
    active = null;
    try { writeReport(previous); } catch (_) { /* Host is shutting down. */ }
  }
}
module.exports = { activate, deactivate };
