package dev.albatany.activitylab.ui;
import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.DumbAwareAction;
import org.jetbrains.annotations.NotNull;
public final class PresetsAction extends DumbAwareAction {
    @Override public void actionPerformed(@NotNull AnActionEvent e) { if (e.getProject() != null) new PresetsDialog(e.getProject()).show(); }
    @Override public void update(@NotNull AnActionEvent e) { e.getPresentation().setEnabled(e.getProject() != null); }
    @Override public @NotNull ActionUpdateThread getActionUpdateThread() { return ActionUpdateThread.BGT; }
}
