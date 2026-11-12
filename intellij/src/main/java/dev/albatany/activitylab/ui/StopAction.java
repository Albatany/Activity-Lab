package dev.albatany.activitylab.ui;
import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.DumbAwareAction;
import dev.albatany.activitylab.SessionService;
import org.jetbrains.annotations.NotNull;
public final class StopAction extends DumbAwareAction {
    @Override public void actionPerformed(@NotNull AnActionEvent e) { if (e.getProject() != null) SessionService.getInstance(e.getProject()).stop("Stopped by user"); }
    @Override public void update(@NotNull AnActionEvent e) { e.getPresentation().setEnabled(e.getProject() != null); }
    @Override public @NotNull ActionUpdateThread getActionUpdateThread() { return ActionUpdateThread.BGT; }
}
