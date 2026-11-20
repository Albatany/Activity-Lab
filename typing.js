'use strict';

const vscode = require('vscode');

function difference(before, after) {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let end = before.length;
  let tail = after.length;
  while (end > start && tail > start && before[end - 1] === after[tail - 1]) {
    end--;
    tail--;
  }
  return { start, end, text: after.slice(start, tail) };
}

async function typeStep(session, editor, original, base, next) {
  const doc = editor.document;
  let version = doc.version;
  let changed = false;
  let finished = false;
  const manualEdit = () => new Error('The scratch file changed during typing. Activity Lab kept the edit.');
  async function replace(start, end, text) {
    if (doc.version !== version) throw manualEdit();
    if (start === end && !text) return;
    const range = new vscode.Range(doc.positionAt(start), doc.positionAt(end));
    const applied = await editor.edit(builder => builder.replace(range, text), {
      undoStopBefore: !changed, undoStopAfter: false
    });
    if (!applied) throw new Error('VS Code could not apply the typing edit.');
    if (doc.version !== version + 1) throw manualEdit();
    version = doc.version;
    changed = true;
  }
  try {
    const removal = difference(original, base);
    await replace(removal.start, removal.end, removal.text);
    const addition = difference(base, next);
    let offset = addition.start;
    let end = addition.end;
    for (const character of addition.text) {
      if (!session.running) return false;
      await replace(offset, end, character);
      offset += character.length;
      end = offset;
      const cursor = doc.positionAt(offset);
      editor.selection = new vscode.Selection(cursor, cursor);
      if (character === '\n') editor.revealRange(editor.selection);
      const delay = 16 + Math.floor(Math.random() * 30) + (character === '\n' ? 35 : 0);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    if (doc.version !== version) throw manualEdit();
    if (!session.running) return false;
    finished = true;
    return true;
  } finally {
    // Roll back only our unfinished batch. A user edit owns the document from that point.
    if (!finished && changed && doc.version === version) {
      const restore = difference(doc.getText(), original);
      await replace(restore.start, restore.end, restore.text);
      if (!await doc.save()) throw new Error('VS Code could not save the restored scratch file.');
    }
  }
}

module.exports = { typeStep };

