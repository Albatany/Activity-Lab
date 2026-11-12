package dev.albatany.activitylab.ui;

import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.DumbAwareAction;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.ToolWindowManager;
import dev.albatany.activitylab.SessionService;
import org.jetbrains.annotations.NotNull;

public final class StartAction extends DumbAwareAction {
    public static void start(Project project) {
        SessionService service = SessionService.getInstance(project);
        if (service.isRunning()) return;
        SessionDialog dialog = new SessionDialog(project);
        if (dialog.showAndGet()) {
            service.start(dialog.options());
            var window = ToolWindowManager.getInstance(project).getToolWindow("Activity Lab");
            if (window != null) window.show();
        }
    }
    @Override public void actionPerformed(@NotNull AnActionEvent event) { if (event.getProject() != null) start(event.getProject()); }
    @Override public void update(@NotNull AnActionEvent event) { event.getPresentation().setEnabled(event.getProject() != null); }
    @Override public @NotNull ActionUpdateThread getActionUpdateThread() { return ActionUpdateThread.BGT; }
}
