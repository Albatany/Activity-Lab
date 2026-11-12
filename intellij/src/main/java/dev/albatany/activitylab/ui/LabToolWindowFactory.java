package dev.albatany.activitylab.ui;

import com.intellij.ide.actions.RevealFileAction;
import com.intellij.openapi.project.*;
import com.intellij.openapi.util.Disposer;
import com.intellij.openapi.wm.*;
import com.intellij.ui.components.*;
import com.intellij.ui.content.ContentFactory;
import com.intellij.util.ui.JBUI;
import dev.albatany.activitylab.SessionService;
import org.jetbrains.annotations.NotNull;
import javax.swing.*;
import java.awt.*;

public final class LabToolWindowFactory implements ToolWindowFactory, DumbAware {
    @Override public void createToolWindowContent(@NotNull Project project, @NotNull ToolWindow toolWindow) {
        SessionService service = SessionService.getInstance(project);
        JPanel root = new JPanel(new BorderLayout(0, JBUI.scale(12))); root.setBorder(JBUI.Borders.empty(14));
        root.add(new JBLabel("<html><h2>Activity Lab</h2>Editor experiments by Albatany</html>"), BorderLayout.NORTH);
        JTextArea status = new JTextArea(); status.setEditable(false); status.setLineWrap(true); status.setWrapStyleWord(true);
        status.setBorder(JBUI.Borders.empty(8)); root.add(new JBScrollPane(status), BorderLayout.CENTER);
        JPanel buttons = new JPanel(new GridLayout(0, 2, JBUI.scale(6), JBUI.scale(6)));
        JButton start = new JButton("New Simulation"), pause = new JButton("Pause"), stop = new JButton("Stop");
        JButton saved = new JButton("Saved Languages"), folder = new JButton("Open Session Folder");
        start.addActionListener(e -> StartAction.start(project));
        pause.addActionListener(e -> service.togglePause()); stop.addActionListener(e -> service.stop("Stopped by user"));
        saved.addActionListener(e -> new PresetsDialog(project).show());
        folder.addActionListener(e -> { if (service.lastFolder() != null) RevealFileAction.openDirectory(service.lastFolder()); });
        buttons.add(start); buttons.add(saved); buttons.add(pause); buttons.add(stop); buttons.add(folder);
        JCheckBox background = new JCheckBox("Run in background (local simulation)");
        background.setToolTipText("Continue local session steps while the IDE is inactive.");
        background.addActionListener(e -> service.setBackgroundAllowed(background.isSelected()));
        JPanel bottom = new JPanel(new BorderLayout(0, JBUI.scale(10))); bottom.add(buttons);
        bottom.add(background, BorderLayout.NORTH);
        bottom.add(new JBLabel("Local simulation · © Albatany 2026"), BorderLayout.SOUTH); root.add(bottom, BorderLayout.SOUTH);
        Runnable refresh = () -> {
            status.setText(service.status());
            background.setSelected(service.isBackgroundAllowed()); background.setEnabled(service.hasActiveSession());
            start.setEnabled(!service.isRunning()); pause.setEnabled(service.isRunning()); stop.setEnabled(service.isRunning());
            pause.setText(service.isPaused() ? "Resume" : "Pause"); folder.setEnabled(service.lastFolder() != null);
        };
        service.addListener(refresh); refresh.run();
        var content = ContentFactory.getInstance().createContent(root, "Session", false);
        Disposer.register(content, () -> service.removeListener(refresh)); toolWindow.getContentManager().addContent(content);
    }
}
