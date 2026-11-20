'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../languages.json');

async function testSessionOptions({ vscode, commands, timers, root }) {
  const { window } = vscode;
  const tick = () => new Promise(resolve => setImmediate(resolve));
  const stateFile = path.join(root, 'global-state.json');
  const sessionRoot = path.join(root, '.vscode-activity-lab');
  let opened = [];
  let edits = [];
  let delays = [];
  let messages = [];
  let source = 'multiple';
  let names = ['Python', 'SQL', 'JSON'];
  let save = false;
  let deletePreset = false;
  let confirmDelete = true;
  let animated = false;
  let manual = false;
  let paused = false;
  let wake;
  const originalTimer = global.setTimeout;
  const readState = () => fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
  const state = () => ({
    get: (key, fallback) => readState()[key] ?? fallback,
    update: async (key, value) => fs.writeFileSync(stateFile, JSON.stringify({ ...readState(), [key]: value }))
  });
  const reload = async () => {
    const id = require.resolve('../extension');
    await require(id).deactivate();
    delete require.cache[id];
    require(id).activate({ subscriptions: [], globalState: state() });
  };
  const until = async predicate => {
    for (let i = 0; i < 10000; i++) {
      if (predicate()) return;
      await tick();
    }
    assert.fail('Timed out waiting for the simulated editor');
  };
  const start = () => commands.get('activityLab.start')();
  const stop = () => commands.get('activityLab.stop')();
  const report = () => JSON.parse(fs.readFileSync(path.join(path.dirname(opened.at(-1)), 'session-report.json')));
  const next = () => timers.find(timer => timer.active && timer.ms === 15000).fn();
  const fresh = async () => {
    opened = [];
    edits = [];
    delays = [];
    await start();
    await until(() => opened.length > 0);
    await tick();
  };

  window.showQuickPick = async (items, options) => {
    if (options.title === 'Activity Lab') {
      assert.equal(items.length, 6);
      assert(items.every(item => /^\$\([a-z-]+\) /.test(item.label)));
      return items.find(item => item.source === source);
    }
    if (options.canPickMany) return names === 'all' ? items : items.filter(item => names.includes(item.label));
    if (options.title === 'Single language') return items.find(item => item.label === names[0]);
    if (options.title === 'Language selection') return save ? 'Save preset' : 'Use once';
    if (options.title === 'Saved Language') return items[0];
    if (items.includes('Use preset')) return deletePreset ? 'Delete preset' : 'Use preset';
    if (options.title === 'Typing style') return items.find(item => item.animated === animated);
    if (options.title === 'Session duration') return items.find(item => item.minutes === null);
    if (options.title === 'Professional Modes') {
      const roles = items.filter(item => item.mode);
      assert.equal(roles.length, 44);
      let category;
      for (const item of items) {
        if (item.kind === vscode.QuickPickItemKind.Separator) { category = item.label; continue; }
        assert.equal(item.mode.category, category);
        assert.equal(item.label, `$(${item.mode.icon}) ${item.mode.title}`);
        assert.equal(item.description, item.mode.profiles.map(profile => profile.label).join(', '));
      }
      return roles.find(item => item.mode.title === 'FPGA Engineer');
    }
    return items[0];
  };
  window.showInputBox = async options => {
    if (options.title !== 'Save preset') return '';
    assert(options.validateInput('  '));
    assert.equal(options.validateInput('Polyglot'), undefined);
    return '  Polyglot  ';
  };
  window.showWarningMessage = async (_, options, action) => action === 'Delete' && !confirmDelete ? undefined : action;
  window.showErrorMessage = async text => { messages.push(text); };
  window.showInformationMessage = async text => { messages.push(text); };
  window.showTextDocument = async doc => {
    opened.push(doc.uri.fsPath);
    doc.version = 1;
    const saveFile = doc.save;
    doc.save = async () => { messages.push('file saved'); return saveFile(); };
    return {
      document: doc, revealRange() {},
      async edit(callback) {
        const edit = new vscode.WorkspaceEdit();
        callback({ replace: (range, content) => edit.replace(doc.uri, range, content) });
        await vscode.workspace.applyEdit(edit);
        doc.version++;
        edits.push(edit.operations[0].content);
        if (manual && edits.length === 2) {
          fs.appendFileSync(doc.uri.fsPath, 'manual text\n');
          doc.version++;
        }
        return true;
      }
    };
  };
  global.setTimeout = (fn, ms) => {
    delays.push(ms);
    if (paused) { wake = fn; return; }
    return setImmediate(fn);
  };
  try {
    await reload();
    save = true;
    await fresh();
    for (let i = 1; i < 6; i++) await next();
    for (const offset of [0, 3]) assert.equal(new Set(opened.slice(offset, offset + 3)).size, 3);
    assert.notEqual(opened[2], opened[3]);
    await stop();
    assert.deepEqual(report().files.map(file => file.language).sort(), names.slice().sort());
    assert.equal(state().get('languagePresets')[0].name, 'Polyglot');

    await reload();
    source = 'saved';
    await fresh();
    await stop();
    assert.equal(report().simulated_mode, 'Polyglot');
    assert.equal(report().files.length, 3);
    deletePreset = true;
    confirmDelete = false;
    await start();
    assert.equal(state().get('languagePresets').length, 1);
    confirmDelete = true;
    await start();
    assert.deepEqual(state().get('languagePresets'), []);
    await reload();
    await start();
    assert(messages.some(message => message.includes('No presets yet')));

    source = 'multiple';
    names = 'all';
    save = false;
    await fresh();
    for (let i = 1; i < catalog.length; i++) await next();
    assert.equal(new Set(opened).size, catalog.length);
    await stop();
    assert.equal(report().files.length, catalog.length);
    assert.equal(report().synthetic_additions, 4 * catalog.length);
    assert.deepEqual(state().get('languagePresets'), []);

    const before = fs.readdirSync(sessionRoot);
    names = [];
    await start();
    assert.deepEqual(fs.readdirSync(sessionRoot), before);
    names = ['Python'];
    await fresh();
    await stop();
    assert.equal(report().simulated_mode, 'Single language');
    assert.equal(report().typing_style, 'instant');
    source = 'mode';
    await fresh();
    for (let i = 1; i < 5; i++) await next();
    await stop();
    assert.equal(report().simulated_mode, 'FPGA Engineer');
    assert.deepEqual(opened.map(file => path.basename(file)), report().files.map(file => file.name));

    source = 'local';
    names = ['JSON'];
    animated = true;
    messages = [];
    await fresh();
    await until(() => delays.length > 1);
    // A busy animation cannot start a second, overlapping batch.
    await next();
    await until(() => messages.includes('file saved'));
    await tick();
    assert(edits.filter(text => text.length === 1).length > 40);
    assert(new Set(delays).size > 1);
    await next();
    await stop();
    assert.equal(report().typing_style, 'character');
    assert.equal(report().synthetic_steps, 2);
    assert.equal(report().synthetic_additions, 8);
    assert.equal(report().synthetic_deletions, 4);
    assert.equal(JSON.parse(fs.readFileSync(opened.at(-1), 'utf8')).entries.length, 4);

    paused = true;
    await fresh();
    await until(() => wake !== undefined);
    const ending = stop();
    paused = false;
    wake();
    await ending;
    assert.equal(report().synthetic_steps, 0);
    assert.deepEqual(JSON.parse(fs.readFileSync(opened.at(-1), 'utf8')).entries, []);
    assert(timers.every(timer => !timer.active));

    manual = true;
    messages = [];
    await fresh();
    await until(() => timers.every(timer => !timer.active));
    await stop();
    assert(messages.some(message => message.includes('changed during typing')));
    assert(fs.readFileSync(opened.at(-1), 'utf8').endsWith('manual text\n'));
    assert.equal(report().synthetic_steps, 0);
    console.log('PASS: all-profile rotation, preset reload and deletion, mode descriptions, character edits, cancellation and manual edits.');
  } finally {
    global.setTimeout = originalTimer;
  }
}

module.exports = { testSessionOptions };

