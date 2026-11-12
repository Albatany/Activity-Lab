package dev.albatany.activitylab.ui;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.*;
import com.intellij.ui.DocumentAdapter;
import com.intellij.ui.components.*;
import com.intellij.util.ui.JBUI;
import dev.albatany.activitylab.PresetsService;
import dev.albatany.activitylab.core.*;
import org.jetbrains.annotations.*;
import javax.swing.*;
import javax.swing.event.DocumentEvent;
import javax.swing.table.*;
import java.awt.*;
import java.util.List;
import java.util.*;
import java.util.regex.Pattern;

public final class SessionDialog extends DialogWrapper {
    private final Project project;
    private final List<LanguageProfile> profiles = new ArrayList<>(Catalog.languages());
    private final DefaultTableModel model;
    private final JTable table;
    private final TableRowSorter<DefaultTableModel> sorter;
    private final JTextField search = new JBTextField();
    private final JComboBox<Catalog.Mode> modes = new JComboBox<>(Catalog.modes().toArray(Catalog.Mode[]::new));
    private final JComboBox<PresetBook.Preset> presets = new JComboBox<>();
    private final JSpinner minutes = new JSpinner(new SpinnerNumberModel(15, 1, 480, 1));
    private final JCheckBox unlimited = new JCheckBox("Until I Stop");
    private final JComboBox<Integer> interval = new JComboBox<>(new Integer[]{15, 30, 60, 120});
    private final JComboBox<EditPattern> pattern = new JComboBox<>(EditPattern.values());
    private final JCheckBox openEditors = new JCheckBox("Show each language file in the editor", true);
    private final JCheckBox runInBackground = new JCheckBox("Run in background (local simulation)");
    private final JLabel count = new JBLabel();
    private String selectionName = "Custom Language Selection";
    private boolean applyingSelection;
    private SessionOptions options;

    public SessionDialog(Project project) {
        super(project); this.project = project;
        setTitle("Activity Lab | New Simulation"); setOKButtonText("Start Simulation");
        runInBackground.setSelected(!PresetsService.getInstance().foregroundOnly());
        runInBackground.setToolTipText("Keep generating local edits while IntelliJ is inactive.");
        model = new DefaultTableModel(new Object[]{"Use", "Language or file profile", "Extension", "Category"}, 0) {
            @Override public Class<?> getColumnClass(int column) { return column == 0 ? Boolean.class : String.class; }
            @Override public boolean isCellEditable(int row, int column) { return column == 0; }
        };
        List<String> previous = PresetsService.getInstance().lastLanguages();
        if (previous.isEmpty()) previous = List.of("Java", "Kotlin", "SQL", "Markdown");
        for (LanguageProfile language : Catalog.languages())
            model.addRow(new Object[]{previous.contains(language.label()), language.label(), language.ext(), language.category()});
        table = new JTable(model); table.setRowHeight(JBUI.scale(26));
        table.getColumnModel().getColumn(0).setMaxWidth(JBUI.scale(45));
        table.getColumnModel().getColumn(1).setPreferredWidth(JBUI.scale(230));
        sorter = new TableRowSorter<>(model); table.setRowSorter(sorter);
        search.getDocument().addDocumentListener(new DocumentAdapter() {
            @Override protected void textChanged(@NotNull DocumentEvent e) {
                sorter.setRowFilter(search.getText().isBlank() ? null : RowFilter.regexFilter("(?i)" + Pattern.quote(search.getText()), 1, 2, 3));
            }
        });
        model.addTableModelListener(e -> {
            if (!applyingSelection) selectionName = "Custom Language Selection";
            count.setText(selected().size() + " selected · maximum 48 per session");
        });
        count.setText(selected().size() + " selected · maximum 48 per session");
        unlimited.addActionListener(e -> minutes.setEnabled(!unlimited.isSelected()));
        refreshPresets(); init();
    }
    public SessionOptions options() { return options; }
    private List<LanguageProfile> selected() {
        List<LanguageProfile> result = new ArrayList<>();
        for (int i = 0; i < model.getRowCount(); i++) if (Boolean.TRUE.equals(model.getValueAt(i, 0))) result.add(profiles.get(i));
        return result;
    }
    private void select(List<String> labels, String name) {
        applyingSelection = true;
        try { for (int i = 0; i < model.getRowCount(); i++) model.setValueAt(labels.contains(model.getValueAt(i, 1)), i, 0); }
        finally { applyingSelection = false; }
        selectionName = name;
    }
    private void refreshPresets() {
        presets.removeAllItems(); PresetsService.getInstance().presets().forEach(presets::addItem);
    }
    @Override protected @Nullable JComponent createCenterPanel() {
        JPanel root = new JPanel(new BorderLayout(JBUI.scale(12), JBUI.scale(12)));
        root.setPreferredSize(JBUI.size(800, 670));
        JPanel top = new JPanel(); top.setLayout(new BoxLayout(top, BoxLayout.Y_AXIS));
        top.add(new JBLabel("Choose a curated mode, load Saved Languages, or check your own combination."));
        JButton apply = new JButton("Apply Mode");
        apply.addActionListener(e -> { Catalog.Mode mode = (Catalog.Mode)modes.getSelectedItem(); if (mode != null) select(mode.languages(), mode.title()); });
        top.add(row("Curated mode", modes, apply));
        JButton load = new JButton("Load");
        load.addActionListener(e -> { PresetBook.Preset p = (PresetBook.Preset)presets.getSelectedItem(); if (p != null) select(p.languages(), "Preset: " + p.name()); });
        JButton save = new JButton("Save Selection"); save.addActionListener(e -> savePreset());
        JButton manage = new JButton("Manage"); manage.addActionListener(e -> { new PresetsDialog(project).show(); refreshPresets(); });
        top.add(row("Saved Languages", presets, load, save, manage));
        JButton custom = new JButton("Custom File Profile"); custom.addActionListener(e -> customProfile(""));
        top.add(row("More profiles", new JBLabel("Offline"), custom));
        top.add(row("Search languages", search)); root.add(top, BorderLayout.NORTH);
        JPanel languagePanel = new JPanel(new BorderLayout(0, JBUI.scale(6)));
        languagePanel.add(new JBScrollPane(table), BorderLayout.CENTER);
        JButton clear = new JButton("Clear Selection"); clear.addActionListener(e -> select(List.of(), "Custom Language Selection"));
        JPanel selectionFooter = new JPanel(new BorderLayout()); selectionFooter.add(count); selectionFooter.add(clear, BorderLayout.EAST);
        languagePanel.add(selectionFooter, BorderLayout.SOUTH); root.add(languagePanel);
        JPanel bottom = new JPanel(); bottom.setLayout(new BoxLayout(bottom, BoxLayout.Y_AXIS));
        bottom.add(row("Duration in minutes", minutes, unlimited));
        bottom.add(row("Edit interval in seconds", interval));
        bottom.add(row("Local edit pattern", pattern));
        bottom.add(openEditors);
        bottom.add(runInBackground);
        bottom.add(new JBLabel("<html><br>Generated changes are synthetic and stay in a local sandbox.<br>" +
            "Background mode keeps local steps running. Pausing or waiting keeps the original end time.<br>" +
            "No external activity-tracking service is contacted. © Albatany 2026</html>"));
        root.add(bottom, BorderLayout.SOUTH); return root;
    }
    private static JPanel row(String label, JComponent field, JComponent... buttons) {
        JPanel panel = new JPanel(new BorderLayout(JBUI.scale(8), 0));
        panel.setBorder(JBUI.Borders.empty(4, 0));
        JLabel title = new JBLabel(label); title.setPreferredSize(JBUI.size(170, 28)); title.setLabelFor(field);
        panel.add(title, BorderLayout.WEST); panel.add(field, BorderLayout.CENTER);
        if (buttons.length > 0) {
            JPanel actions = new JPanel(new FlowLayout(FlowLayout.RIGHT, JBUI.scale(4), 0));
            for (JComponent button : buttons) actions.add(button);
            panel.add(actions, BorderLayout.EAST);
        }
        return panel;
    }
    private void savePreset() {
        try {
            List<LanguageProfile> selection = selected();
            if (selection.isEmpty() || selection.size() > 48) throw new IllegalArgumentException("Choose between 1 and 48 languages first.");
            if (selection.stream().anyMatch(p -> !Catalog.languages().contains(p)))
                throw new IllegalArgumentException("Saved Languages supports built-in profiles. Custom file profiles are available for this session only.");
            String name = Messages.showInputDialog(project, "Give this language combination a name.", "Save Languages", null);
            if (name == null) return;
            String valid = SessionOptions.validateName(name, 40, "Preset name", false);
            boolean exists = PresetsService.getInstance().presets().stream().anyMatch(p -> p.name().equalsIgnoreCase(valid));
            if (exists && Messages.showYesNoDialog(project, "Replace the saved languages in \"" + valid + "\"?", "Update Saved Languages", null) != Messages.YES) return;
            PresetsService.getInstance().save(valid, selection, exists); refreshPresets();
        } catch (IllegalArgumentException e) { Messages.showErrorDialog(project, e.getMessage(), "Cannot Save Languages"); }
    }
    @Override protected @Nullable ValidationInfo doValidate() {
        try { buildOptions(); return null; }
        catch (Exception e) { return new ValidationInfo(e.getMessage(), table); }
    }
    private SessionOptions buildOptions() throws java.text.ParseException {
        if (!unlimited.isSelected()) {
            minutes.commitEdit();
            int duration = (Integer)minutes.getValue();
            if (duration < 1 || duration > 480) throw new IllegalArgumentException("Enter a duration from 1 to 480 minutes.");
        }
        return new SessionOptions(selected(), selectionName,
            unlimited.isSelected() ? 0 : (Integer)minutes.getValue(), (Integer)interval.getSelectedItem(),
            (EditPattern)pattern.getSelectedItem(), openEditors.isSelected(), !runInBackground.isSelected());
    }
    @Override protected void doOKAction() {
        try { options = buildOptions(); super.doOKAction(); }
        catch (Exception e) { setErrorText(e.getMessage()); }
    }
    @Override public @Nullable JComponent getPreferredFocusedComponent() { return search; }
    private void customProfile(String name) {
        CustomProfileDialog dialog = new CustomProfileDialog(project, name);
        if (!dialog.showAndGet()) return;
        LanguageProfile profile = dialog.profile();
        for (int i = 0; i < profiles.size(); i++) if (profiles.get(i).label().equalsIgnoreCase(profile.label())) {
            Messages.showErrorDialog(project, "That name already exists. Select it in the language list or use a different name.", "Profile Already Exists"); return;
        }
        profiles.add(profile); model.addRow(new Object[]{true, profile.label(), profile.ext(), profile.category()});
        search.setText("");
    }

}
