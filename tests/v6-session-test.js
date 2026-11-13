'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { createSessionClock } = require('../sessionClock');
const { PRESET_STORAGE_KEY, LAST_SELECTED_KEY, readPresets, savePreset, renamePreset } = require('../languageSelection');
const catalog = require('../languages.json');

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function gate() { return { entered: deferred(), release: deferred() }; }

function harness() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'activitylab-v6-'));
  const original = { load: Module._load, home: os.homedir, interval: global.setInterval, clear: global.clearInterval, now: Date.now };
  const commands = new Map();
  const memory = new Map([
    [PRESET_STORAGE_KEY, [{ name: 'From v5', languages: ['Python', 'SQL'] }]],
    [LAST_SELECTED_KEY, ['Python', 'SQL']]
  ]);
  const state = { get: (key, fallback) => memory.has(key) ? memory.get(key) : fallback,
    async update(key, value) { memory.set(key, value); } };
  const timers = [];
  const ui = {
    kind: 'local', minutes: null, presetAction: 'rename', name: 'My Backend Stack',
    selected: ['Rust', 'Go'], replace: true, delete: true, control: 'pause',
    now: Date.now(), edits: 0, errors: [], warnings: [], status: {}, folder: null,
    nextOpenGate: null, applyGate: null, pickerGate: null
  };
  os.homedir = () => root;
  Date.now = () => ui.now;
  global.setInterval = (fn, ms) => { const timer = { fn, ms, active: true }; timers.push(timer); return timer; };
  global.clearInterval = timer => { if (timer) timer.active = false; };
  class Range { constructor(start, end) { this.start = start; this.end = end; } }
  class WorkspaceEdit {
    constructor() { this.operations = []; }
    insert(uri, position, text) { this.operations.push({ uri, start: position, end: position, text }); }
    delete(uri, range) { this.operations.push({ uri, ...range, text: '' }); }
    replace(uri, range, text) { this.operations.push({ uri, ...range, text }); }
  }
  const vscode = {
    Range, WorkspaceEdit, Uri: { file: fsPath => ({ fsPath }) }, StatusBarAlignment: { Right: 1 },
    commands: { registerCommand: (id, fn) => { commands.set(id, fn); return { dispose() {} }; } },
    languages: { getLanguages: async () => ['plaintext'] },
    workspace: {
      async openTextDocument(uri) {
        const wait = ui.nextOpenGate;
        ui.nextOpenGate = null;
        if (wait) { wait.entered.resolve(); await wait.release.promise; }
        return { uri, languageId: 'plaintext', getText: () => fs.readFileSync(uri.fsPath, 'utf8'),
          positionAt: offset => offset, save: async () => true };
      },
      async applyEdit(edit) {
        const wait = ui.applyGate;
        ui.applyGate = null;
        if (wait) { wait.entered.resolve(); await wait.release.promise; }
        for (const file of new Set(edit.operations.map(operation => operation.uri.fsPath))) {
          let text = fs.readFileSync(file, 'utf8');
          for (const operation of edit.operations.filter(item => item.uri.fsPath === file).sort((a, b) => b.start - a.start)) {
            text = text.slice(0, operation.start) + operation.text + text.slice(operation.end);
          }
          fs.writeFileSync(file, text);
        }
        ui.edits += 1;
        return true;
      }
    },
    window: {
      createStatusBarItem: () => Object.assign(ui.status, { show() {}, dispose() {} }),
      async showTextDocument(doc) { ui.folder = path.dirname(doc.uri.fsPath); },
      async showQuickPick(items, options = {}) {
        if (ui.pickerGate) {
          const wait = ui.pickerGate;
          ui.pickerGate = null;
          wait.entered.resolve(); await wait.release.promise;
        }
        if (options.title === 'Activity Lab | Choose a simulation type') return items.find(item => item.kind === ui.kind);
        if (options.title === 'Single language') return items.find(item => item.label === 'SQL');
        if (options.title === 'Session duration') return items.find(item => item.minutes === ui.minutes);
        if (options.title === 'Synthetic line change pattern') return items.find(item => item.data.id === 'balanced');
        if (options.title === 'Activity Lab | Session controls') return items.find(item => item.action === ui.control);
        if (options.canPickMany) return ui.selected.map(label => items.find(item => item.label === label));
        if (options.title === 'Your language combination') return items.find(item => item.action === 'save');
        if (items.some(item => item.action === 'rename')) return items.find(item => item.action === ui.presetAction);
        return items[0];
      },
      async showInputBox(options) { return options.title.includes('preset') ? ui.name : ''; },
      async showWarningMessage(message, options, confirm) {
        ui.warnings.push(message);
        if (confirm === 'Replace preset' && !ui.replace) return undefined;
        if (confirm === 'Delete preset' && !ui.delete) return undefined;
        return confirm;
      },
      async showInformationMessage() {},
      async showErrorMessage(message) { ui.errors.push(message); }
    }
  };
  Module._load = function (name, ...rest) { return name === 'vscode' ? vscode : original.load.call(this, name, ...rest); };
  const extensionPath = require.resolve('../extension');
  delete require.cache[extensionPath];
  const extension = require(extensionPath);
  extension.activate({ globalState: state, subscriptions: [] });
  return {
    ui, memory, state, root, timers, extension,
    command: name => commands.get(`activityLab.${name}`)(),
    async start() { await this.command('start'); await new Promise(setImmediate); },
    async tick() { await timers.find(timer => timer.active && timer.ms === 15_000)?.fn(); },
    async statusTick() { await timers.find(timer => timer.active && timer.ms === 10_000)?.fn(); },
    report: () => JSON.parse(fs.readFileSync(path.join(ui.folder, 'session-report.json'), 'utf8')),
    async close() {
      await extension.deactivate();
      delete require.cache[extensionPath];
      Module._load = original.load; os.homedir = original.home;
      global.setInterval = original.interval; global.clearInterval = original.clear; Date.now = original.now;
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}

test('v5 preset data remains reusable; rename, edit and delete respect cancellation', async () => {
  const h = harness();
  try {
    h.ui.kind = 'presets';
    await h.start();
    assert.deepEqual(h.report().selected_languages, ['Python', 'SQL']);
    await h.command('stop');
    await h.command('presets');
    assert.equal(readPresets(h.state, catalog)[0].name, 'My Backend Stack');
    assert.deepEqual(h.memory.get(LAST_SELECTED_KEY), ['Python', 'SQL']);
    h.ui.presetAction = 'edit'; h.ui.replace = false;
    await h.command('presets');
    assert.deepEqual(readPresets(h.state, catalog)[0].languages, ['Python', 'SQL']);
    h.ui.replace = true;
    await h.command('presets');
    assert.deepEqual(readPresets(h.state, catalog)[0].languages, ['Rust', 'Go']);
    h.ui.presetAction = 'delete'; h.ui.delete = false;
    await h.command('presets');
    assert.equal(readPresets(h.state, catalog).length, 1);
    h.ui.delete = true;
    await h.command('presets');
    assert.equal(readPresets(h.state, catalog).length, 0);
    assert.deepEqual(h.ui.errors, []);
  } finally { await h.close(); }
});

test('preset names ignore case and whitespace; collisions do not overwrite another preset', async () => {
  const memory = new Map();
  const state = { get: (key, fallback) => memory.get(key) || fallback, async update(key, value) { memory.set(key, value); } };
  await savePreset(state, catalog, 'Backend', ['SQL']);
  await savePreset(state, catalog, ' backend ', ['Python']);
  assert.equal(readPresets(state, catalog).length, 1);
  await savePreset(state, catalog, 'Frontend', ['HTML']);
  const before = JSON.stringify(memory.get(PRESET_STORAGE_KEY));
  await assert.rejects(renamePreset(state, catalog, 'backend', ' FRONTEND '), /already exists/);
  assert.equal(JSON.stringify(memory.get(PRESET_STORAGE_KEY)), before);
  await renamePreset(state, catalog, 'backend', 'BACKEND');
  assert.equal(readPresets(state, catalog)[0].name, 'BACKEND');
  for (let index = 2; index < 20; index++) await savePreset(state, catalog, `Preset ${index}`, ['SQL']);
  await renamePreset(state, catalog, 'BACKEND', 'Renamed at capacity');
  await assert.rejects(savePreset(state, catalog, 'Extra', ['SQL']), /up to 20/);
});

test('replacing a named preset from the start flow requires confirmation', async () => {
  const h = harness();
  try {
    h.ui.kind = 'multiple'; h.ui.name = ' from V5 '; h.ui.replace = false;
    await h.start();
    assert.equal(h.ui.folder, null);
    assert.deepEqual(readPresets(h.state, catalog)[0].languages, ['Python', 'SQL']);
    h.ui.replace = true;
    await h.start();
    assert.deepEqual(readPresets(h.state, catalog)[0].languages, ['Rust', 'Go']);
    assert.equal(readPresets(h.state, catalog).length, 1);
  } finally { await h.close(); }
});

test('Pause/Resume preserves files, counters and deadline; reports reflect every transition', async () => {
  const h = harness();
  try {
    h.ui.minutes = 5;
    await h.start();
    const before = h.report();
    assert.equal(before.extension_version, '6.1.2');
    assert.equal(before.session_state, 'running');
    assert.equal(before.stopped_at, null);
    assert.equal(before.synthetic_steps, 1);
    await h.command('controls');
    const snapshot = fs.readFileSync(path.join(h.ui.folder, before.files[0].name), 'utf8');
    for (let tick = 0; tick < 3; tick++) await h.tick();
    assert.equal(h.ui.edits, 1);
    assert.equal(fs.readFileSync(path.join(h.ui.folder, before.files[0].name), 'utf8'), snapshot);
    assert.equal(h.report().session_state, 'paused');
    assert.match(h.ui.status.text, /Paused/);
    h.ui.now += 60_000;
    h.ui.control = 'resume'; await h.command('controls');
    assert.equal(h.report().synthetic_steps, 2);
    // The real monotonic clock can advance by a fraction of a second while the
    // test's wall clock is frozen; the report intentionally rounds down.
    assert(h.report().paused_seconds >= 59 && h.report().paused_seconds <= 60);
    assert.equal(h.report().pause_count, 1);
    assert.equal(h.report().scheduled_end_at, before.scheduled_end_at);
    await h.command('report');
    await h.command('stop');
    assert.equal(h.report().session_state, 'stopped');
    assert(h.report().stopped_at);
    assert.equal(h.report().type, 'LOCAL_SYNTHETIC_TEST_REPORT');
    assert(!('project' in h.report()));
    assert(h.timers.every(timer => !timer.active));
    assert(!fs.readdirSync(h.ui.folder).some(name => name.endsWith('.tmp')));
  } finally { await h.close(); }
});

test('a timed session expires while paused without another edit', async () => {
  const h = harness();
  try {
    h.ui.minutes = 5;
    await h.start(); await h.command('pause');
    h.ui.now += 5 * 60_000;
    await h.statusTick();
    assert.equal(h.report().session_state, 'stopped');
    assert.equal(h.report().synthetic_steps, 1);
    assert.match(h.report().stop_reason, /time limit/);
    await h.command('resume');
    assert.equal(h.ui.edits, 1);
  } finally { await h.close(); }
});

test('Stop cancels an edit awaiting document access and prevents overlapping session starts', async () => {
  const h = harness();
  try {
    await h.start();
    const wait = gate(); h.ui.nextOpenGate = wait;
    const tick = h.tick(); await wait.entered.promise;
    const stop = h.command('stop');
    await h.command('start');
    assert(h.ui.warnings.some(message => message.includes('already running')));
    wait.release.resolve(); await tick; await stop;
    assert.equal(h.report().synthetic_steps, 1);
    assert.equal(h.ui.edits, 1);
    assert(h.timers.every(timer => !timer.active));
  } finally { await h.close(); }
});

test('Stop waits for an edit already submitted to VS Code and includes it in the final report', async () => {
  const h = harness();
  try {
    await h.start();
    const wait = gate(); h.ui.applyGate = wait;
    const tick = h.tick(); await wait.entered.promise;
    let stopped = false;
    const stop = h.command('stop').then(() => { stopped = true; });
    await new Promise(setImmediate);
    assert.equal(stopped, false);
    wait.release.resolve(); await tick; await stop;
    assert.equal(h.report().synthetic_steps, 2);
    assert.equal(h.report().synthetic_additions, 8);
    assert.equal(h.report().session_state, 'stopped');
  } finally { await h.close(); }
});

test('manual scratch edits are preserved and the report explains why the session stopped', async () => {
  const h = harness();
  try {
    await h.start();
    const file = path.join(h.ui.folder, h.report().files[0].name);
    fs.appendFileSync(file, '-- A manual change\n');
    await h.tick(); await new Promise(setImmediate);
    assert(fs.readFileSync(file, 'utf8').endsWith('-- A manual change\n'));
    assert.equal(h.report().synthetic_steps, 1);
    assert.equal(h.report().session_state, 'stopped');
    assert.match(h.ui.errors[0], /edited manually/);
  } finally { await h.close(); }
});

test('Stop cancels pending setup, and deactivation finalizes a paused session', async () => {
  const h = harness();
  try {
    const wait = gate(); h.ui.pickerGate = wait;
    const start = h.command('start'); await wait.entered.promise;
    await h.command('start'); await h.command('stop');
    wait.release.resolve(); await start;
    assert.equal(h.ui.folder, null);
    await h.start(); await h.command('pause');
    await h.extension.deactivate();
    assert.equal(h.report().session_state, 'stopped');
    assert.equal(h.report().stop_reason, 'Extension deactivated.');
    assert(h.timers.every(timer => !timer.active));
  } finally { await h.close(); }
});

test('clock handles backward clock changes, sleep and Until I Stop', () => {
  let wall = 10_000, monotonic = 0;
  const clock = createSessionClock(1, () => wall, () => monotonic);
  wall -= 3_600_000; monotonic += 60_000;
  assert.equal(clock.expired(), true);
  const sleeper = createSessionClock(1, () => wall, () => monotonic);
  wall += 3_600_000;
  assert.equal(sleeper.expired(), true);
  const unlimited = createSessionClock(null, () => wall, () => monotonic);
  wall += 10 * 3_600_000; monotonic += 10 * 3_600_000;
  assert.equal(unlimited.expired(), false);
  assert.equal(unlimited.remainingMs(), null);
});
