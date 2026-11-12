package dev.albatany.activitylab;

import com.intellij.openapi.command.WriteCommandAction;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.fileEditor.*;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import dev.albatany.activitylab.core.FileSimulation;

/** Native document operations; does not call any tracker API or simulate user input. */
public final class EditorOperations {
    private EditorOperations() {}
    public static Document open(Project project, VirtualFile file, boolean showEditor) {
        Document document;
        if (showEditor) {
            var editor = FileEditorManager.getInstance(project).openTextEditor(new OpenFileDescriptor(project, file), false);
            if (editor == null) throw new IllegalStateException("The IDE could not create a text editor for the generated file.");
            document = editor.getDocument();
        } else document = FileDocumentManager.getInstance().getDocument(file);
        if (document == null || !document.isWritable()) throw new IllegalStateException("The IDE could not open an editable text document.");
        return document;
    }
    public static void apply(Project project, Document document, FileSimulation simulation, FileSimulation.Plan plan) {
        WriteCommandAction.runWriteCommandAction(project, "Activity Lab Simulation", null, () -> {
            if (simulation.isJson()) document.setText(plan.after());
            else {
                if (plan.removeCharacters() > 0) document.deleteString(simulation.headerLength(), simulation.headerLength() + plan.removeCharacters());
                document.insertString(document.getTextLength(), plan.appended());
            }
        });
        if (!document.getText().equals(plan.after())) throw new IllegalStateException("Another editor action changed the generated text.");
        FileDocumentManager manager = FileDocumentManager.getInstance();
        manager.saveDocument(document);
        if (manager.isDocumentUnsaved(document) || !document.getText().equals(plan.after()))
            throw new IllegalStateException("The IDE did not save the expected text. Check formatters or save actions.");
    }
}
