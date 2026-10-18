'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'activitylab-v3-test-'));
const commands = new Map();
const allTimers = [];
const origInterval = global.setInterval;
const origClear = global.clearInterval;
const originalLoad = Module._load;
const ORIGINAL_HOME = os.homedir;
os.homedir = () => root;
let scenario = 'sql';
let ratio = 'balanced';
const events = [];

global.setInterval = (fn, ms) => { const timer = { fn, ms, active: true }; allTimers.push(timer); return timer; };
global.clearInterval = t => { if (t) t.active = false; };
class Position { constructor(line, character) { this.line = line; this.character = character; } }
class Range { constructor(start, end) { this.start = start; this.end = end; } }
class WorkspaceEdit {
  constructor() { this.operations = []; }
  insert(uri, pos, content) { this.operations.push({ type: 'insert', uri, pos, content }); }
  replace(uri, range, content) { this.operations.push({ type: 'replace', uri, range, content }); }
  delete(uri, range) { this.operations.push({ type: 'delete', uri, range, content: '' }); }
}
function makeDoc(uri) {
  return {
    uri,
    languageId: 'plaintext',
    getText: () => fs.readFileSync(uri.fsPath, 'utf8'),
    positionAt(offset) { const lines = this.getText().slice(0, offset).split('\n'); return new Position(lines.length - 1, lines.at(-1).length); },
    async save() { events.push('save'); return true; }
  };
}
function offsetOf(text, position) { const chunks = text.split('\n'); return chunks.slice(0,position.line).reduce((n,x) => n+x.length+1,0) + position.character; }
const vscode = {
  Position, Range, WorkspaceEdit,
  Uri: { file: fsPath => ({ fsPath }) },
  StatusBarAlignment: { Right: 1 },
  languages: {
    getLanguages: async () => ['plaintext','python','sql','html','css','javascript','typescript','typescriptreact','shellscript','dockerfile','markdown'],
    setTextDocumentLanguage: async (doc,id) => ({ ...doc, languageId:id })
  },
  commands: { registerCommand: (id,fn) => { commands.set(id,fn); return { dispose() {} }; } },
  workspace: {
    openTextDocument: async uri => makeDoc(uri),
    async applyEdit(edit) {
      // Workspace edits use offsets from the ORIGINAL document; apply last to first.
      const paths = [...new Set(edit.operations.map(op=>op.uri.fsPath))];
      for (const file of paths) {
        const before = fs.readFileSync(file, 'utf8');
        const ops = edit.operations.filter(op=>op.uri.fsPath===file).map(op=>({
          start: offsetOf(before, op.type === 'insert' ? op.pos : op.range.start),
          end: op.type === 'insert' ? null : offsetOf(before,op.range.end),
          content: op.content
        })).map(op=>({...op,end:op.end ?? op.start})).sort((a,b)=>b.start-a.start);
        let next = before;
        for (const op of ops) next = next.slice(0,op.start) + op.content + next.slice(op.end);
        fs.writeFileSync(file, next, 'utf8');
        events.push('edit');
      }
      return true;
    }
  },
  window: {
    createStatusBarItem() { return { text:'',tooltip:'',command:'',show() {},dispose() {} }; },
    async showQuickPick(items) {
      const labels = items.map(x => typeof x === 'string' ? x : x.label);
      if (labels.some(x=>x.includes('Bahasa tunggal'))) return items.find(x => scenario==='stack' ? x.kind==='mode' : x.kind==='local');
      if (labels.includes('Full Stack Developer')) return items.find(x => x.label==='Full Stack Developer');
      if (labels.includes('SQL')) return items.find(x=>x.label === (scenario==='json' ? 'JSON' : scenario==='python' ? 'Python' : 'SQL'));
      if (labels.some(x=>x.startsWith('Seimbang 1:1'))) return items.find(x=>x.data.id===ratio);
      if (labels.includes('5 menit')) return items.find(x=>x.label === (scenario==='stack' ? '8 jam' : 'Jalankan sampai saya hentikan'));
      if (labels.includes('15 detik')) return items[0];
      return items[0];
    },
    async showInputBox() { return scenario === 'stack' ? 'Riset Analitik 2026' : ''; },
    async showWarningMessage(_,__,confirm) { return confirm; },
    async showInformationMessage() {},
    async showErrorMessage(msg) { throw Error(String(msg)); },
    async showTextDocument() { events.push('open-editor'); return { revealRange() {} }; }
  }
};
Module._load = function(name,...rest) { return name === 'vscode' ? vscode : originalLoad.call(this,name,...rest); };
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function main() {
  const ext = require('../extension');
  ext.activate({ subscriptions: [] });
  assert(commands.has('activityLab.start'));
  assert(commands.has('activityLab.stop'));
  assert(commands.has('activityLab.status'));

  scenario = 'sql';
  ratio = 'balanced';
  await commands.get('activityLab.start')();
  await sleep(70);
  let sessionFolders = fs.readdirSync(path.join(root,'.vscode-activity-lab')).filter(x=>x.startsWith('session-'));
  assert.equal(sessionFolders.length,1);
  let folder = path.join(root,'.vscode-activity-lab',sessionFolders[0]);
  assert.equal(fs.readFileSync(path.join(folder,'.wakatime-project'),'utf8'),'ActivityLab Synthetic\n');
  let filename = fs.readdirSync(folder).find(f=>f.endsWith('.sql'));
  assert(filename);
  let file = path.join(folder, filename);
  assert(fs.readFileSync(file,'utf8').includes('SELECT'));
  let timer = allTimers.find(x=>x.active && x.ms===15000);
  assert(timer);
  for (let i=0;i<4;i++) { await timer.fn(); await sleep(50); }
  assert.equal(fs.readFileSync(file,'utf8').split('SELECT').length-1,4,'balanced mode keeps four rows');
  await commands.get('activityLab.status')();
  await commands.get('activityLab.stop')();
  let report = JSON.parse(fs.readFileSync(path.join(folder,'session-report.json'),'utf8'));
  assert.equal(report.synthetic_additions,20);
  assert.equal(report.synthetic_deletions,16);
  assert.equal(report.wakatime_verified,false);
  assert(allTimers.every(x=>!x.active));

  // 4:1 mode retains net additions and removes only prior generated rows.
  scenario='python'; ratio='more';
  await commands.get('activityLab.start')(); await sleep(70);
  sessionFolders = fs.readdirSync(path.join(root,'.vscode-activity-lab')).filter(x=>x.startsWith('session-'));
  folder = path.join(root,'.vscode-activity-lab',sessionFolders.sort().at(-1));
  file = path.join(folder,fs.readdirSync(folder).find(f=>f.endsWith('.py')));
  timer=allTimers.find(x=>x.active && x.ms===15000);
  for (let i=0;i<4;i++) { await timer.fn(); await sleep(50); }
  await commands.get('activityLab.stop')();
  report=JSON.parse(fs.readFileSync(path.join(folder,'session-report.json'),'utf8'));
  assert.equal(report.synthetic_additions,20);
  assert.equal(report.synthetic_deletions,4);
  assert.equal(fs.readFileSync(file,'utf8').split('synthetic_step_').length-1,16);

  // JSON remains parseable after 8:1 line insertions/deletions.
  scenario='json'; ratio='heavy';
  await commands.get('activityLab.start')(); await sleep(70);
  sessionFolders=fs.readdirSync(path.join(root,'.vscode-activity-lab')).filter(x=>x.startsWith('session-'));
  folder=path.join(root,'.vscode-activity-lab',sessionFolders.sort().at(-1));
  file=path.join(folder,fs.readdirSync(folder).find(f=>f.endsWith('.json')));
  timer=allTimers.find(x=>x.active && x.ms===15000);
  for (let i=0;i<2;i++) { await timer.fn(); await sleep(50); }
  assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).entries.length,22);
  await commands.get('activityLab.stop')();
  report=JSON.parse(fs.readFileSync(path.join(folder,'session-report.json'),'utf8'));
  assert.equal(report.synthetic_additions,24);
  assert.equal(report.synthetic_deletions,2);

  scenario='stack'; ratio='balanced';
  await commands.get('activityLab.start')(); await sleep(70);
  sessionFolders=fs.readdirSync(path.join(root,'.vscode-activity-lab')).filter(x=>x.startsWith('session-'));
  assert.equal(sessionFolders.length,4);
  folder=path.join(root,'.vscode-activity-lab',sessionFolders.sort().at(-1));
  const generatedFiles = fs.readdirSync(folder).filter(x=>/_[0-9a-f]{6}\.[\w.+-]+$/.test(x));
  assert(generatedFiles.length >= 8, `full stack files: ${generatedFiles.length}`);
  assert.equal(fs.readFileSync(path.join(folder, '.wakatime-project'),'utf8'), 'Riset Analitik 2026\n');
  timer = allTimers.find(x=>x.active && x.ms===15000);
  assert(timer);
  await timer.fn(); await sleep(50);
  assert(events.filter(x=>x==='open-editor').length>=4, 'rotation opens distinct files');
  await commands.get('activityLab.stop')();
  assert.equal(JSON.parse(fs.readFileSync(path.join(folder, 'session-report.json'),'utf8')).project, 'Riset Analitik 2026');
  assert(allTimers.every(x=>!x.active));
  ext.deactivate();
  assert(events.filter(x=>x==='save').length >= 3);
  console.log('PASS: balanced 1:1, additions 4:1, JSON 8:1, indefinite sessions, 8-hour stack, reports, start/status/stop.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{
  os.homedir = ORIGINAL_HOME;
  global.setInterval = origInterval;
  global.clearInterval = origClear;
  Module._load = originalLoad;
  fs.rmSync(root,{recursive:true,force:true});
});
