package dev.albatany.activitylab.ui;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.*;
import com.intellij.ui.components.*;
import com.intellij.util.ui.JBUI;
import dev.albatany.activitylab.core.LanguageProfile;
import org.jetbrains.annotations.Nullable;
import javax.swing.*;
import java.awt.*;

final class CustomProfileDialog extends DialogWrapper {
    private final JTextField label = new JBTextField(), extension = new JBTextField(".txt");
    private final JComboBox<String> comments = new JComboBox<>(new String[]{"hash", "slash", "sql", "html", "css", "json", "csv", "semi", "percent", "paren"});
    CustomProfileDialog(Project project, String name) {
        super(project); label.setText(name); setTitle("Custom File Profile"); setOKButtonText("Add Profile"); init();
    }
    LanguageProfile profile() { return new LanguageProfile(label.getText().trim(), "plaintext", extension.getText().trim(), "Custom file profile", (String)comments.getSelectedItem()); }
    @Override protected @Nullable JComponent createCenterPanel() {
        JPanel root = new JPanel(new GridLayout(0, 2, JBUI.scale(10), JBUI.scale(10)));
        root.setPreferredSize(JBUI.size(500, 150));
        root.add(new JBLabel("Language or file name")); root.add(label);
        root.add(new JBLabel("Extension, for example .asm")); root.add(extension);
        root.add(new JBLabel("Placeholder comment style")); root.add(comments);
        root.add(new JBLabel("Syntax support depends on installed IDE plugins.")); return root;
    }
    @Override protected @Nullable ValidationInfo doValidate() {
        try { profile(); return null; } catch (Exception e) { return new ValidationInfo(e.getMessage(), label); }
    }
}
