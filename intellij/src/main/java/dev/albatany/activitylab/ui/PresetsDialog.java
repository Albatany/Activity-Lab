package dev.albatany.activitylab.ui;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.*;
import com.intellij.ui.components.*;
import com.intellij.util.ui.JBUI;
import dev.albatany.activitylab.PresetsService;
import dev.albatany.activitylab.core.PresetBook;
import org.jetbrains.annotations.Nullable;
import javax.swing.*;
import java.awt.*;

public final class PresetsDialog extends DialogWrapper {
    private final Project project;
    private final DefaultListModel<PresetBook.Preset> model = new DefaultListModel<>();
    private final JBList<PresetBook.Preset> list = new JBList<>(model);
    private final JTextArea details = new JTextArea();
    public PresetsDialog(Project project) {
        super(project); this.project = project; setTitle("Activity Lab | Saved Languages"); setOKButtonText("Done");
        list.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        details.setEditable(false); details.setLineWrap(true); details.setWrapStyleWord(true);
        list.addListSelectionListener(e -> {
            PresetBook.Preset selected = list.getSelectedValue();
            details.setText(selected == null ? "Save a combination from New Simulation to see it here." : String.join(", ", selected.languages()));
        });
        refresh(); init();
    }
    private void refresh() {
        model.clear(); PresetsService.getInstance().presets().forEach(model::addElement);
        if (!model.isEmpty()) list.setSelectedIndex(0);
        else details.setText("No saved languages yet. Use Save Selection in New Simulation.");
    }
    @Override protected @Nullable JComponent createCenterPanel() {
        JPanel root = new JPanel(new BorderLayout(JBUI.scale(10), JBUI.scale(10))); root.setPreferredSize(JBUI.size(540, 340));
        root.add(new JBLabel("Up to 20 presets. Available across projects in this IDE installation."), BorderLayout.NORTH);
        JSplitPane split = new JSplitPane(JSplitPane.VERTICAL_SPLIT, new JBScrollPane(list), new JBScrollPane(details));
        split.setResizeWeight(0.65); root.add(split);
        JPanel buttons = new JPanel(new FlowLayout(FlowLayout.LEFT));
        JButton rename = new JButton("Rename"); rename.addActionListener(e -> rename());
        JButton delete = new JButton("Delete"); delete.addActionListener(e -> delete());
        buttons.add(rename); buttons.add(delete); root.add(buttons, BorderLayout.SOUTH); return root;
    }
    private void rename() {
        PresetBook.Preset selected = list.getSelectedValue(); if (selected == null) return;
        String name = Messages.showInputDialog(project, "New name for \"" + selected.name() + "\"", "Rename Saved Languages", null, selected.name(), null);
        if (name == null) return;
        try { PresetsService.getInstance().rename(selected.name(), name); refresh(); }
        catch (IllegalArgumentException e) { Messages.showErrorDialog(project, e.getMessage(), "Cannot Rename Preset"); }
    }
    private void delete() {
        PresetBook.Preset selected = list.getSelectedValue(); if (selected == null) return;
        if (Messages.showYesNoDialog(project, "Delete \"" + selected.name() + "\"? Session files will stay on disk.", "Delete Saved Languages", null) == Messages.YES) {
            PresetsService.getInstance().delete(selected.name()); refresh();
        }
    }
    @Override protected Action[] createActions() { return new Action[]{getOKAction()}; }
}
