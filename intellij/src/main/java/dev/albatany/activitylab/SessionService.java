package dev.albatany.activitylab;

import com.google.gson.GsonBuilder;
import com.intellij.notification.*;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.application.*;
import com.intellij.openapi.components.Service;
import com.intellij.openapi.fileEditor.*;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.*;
import com.intellij.util.Alarm;
import com.intellij.util.concurrency.AppExecutorUtil;
import dev.albatany.activitylab.core.*;
import java.nio.file.*;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.CopyOnWriteArrayList;

/** All session mutations occur on the EDT. Disk checks and reports use one ordered worker. */
@Service(Service.Level.PROJECT)
public final class SessionService implements Disposable {
    private static final class FileEntry {
        final Path path;
        final FileSimulation simulation;
        FileEntry(Path path, FileSimulation simulation) { this.path = path; this.simulation = simulation; }
    }
    private static final class Session {
        final SessionOptions options;
        final Path folder;
        final List<FileEntry> files;
        final Instant startedAt = Instant.now();
        final SessionClock clock;
        final ForegroundGuard foreground;
        long nextEdit, sequence, additions, deletions, steps, totalBytes;
        long foregroundSteps, backgroundSteps;
        int index;
        boolean paused;
        // Reports are written asynchronously on the shared worker. A revision prevents an older
        // queued snapshot from overwriting a newer state, especially the terminal stopped report.
        volatile long reportRevision;
        volatile boolean terminal;
        String currentLanguage = "";
        Session(SessionOptions options, Path folder, List<FileEntry> files) {
            this.options = options; this.folder = folder; this.files = files;
            long now = System.nanoTime(); clock = new SessionClock(options.minutes(), now); nextEdit = now;
            foreground = new ForegroundGuard(options.foregroundOnly());
            foreground.update(false, false, IdeWindowState.isActive(), now);
            totalBytes = files.stream().mapToLong(f -> FileSimulation.bytes(f.simulation.expected())).sum();
        }
    }
    private final Project project;
    private final Alarm timer;
    private final ExecutorService worker = AppExecutorUtil.createBoundedApplicationPoolExecutor("Activity Lab files", 1);
    private final List<Runnable> listeners = new CopyOnWriteArrayList<>();
    private Session active;
    private long generation;
    private boolean preparing, busy;
    private volatile boolean disposed;
    private Path lastFolder;
    private String lastMessage = "Ready. Choose your languages to begin.";

    public SessionService(Project project) {
        this.project = project; timer = new Alarm(Alarm.ThreadToUse.SWING_THREAD, this);

    }
    public static SessionService getInstance(Project project) { return project.getService(SessionService.class); }
    public void addListener(Runnable listener) { listeners.add(listener); }
    public void removeListener(Runnable listener) { listeners.remove(listener); }
    public boolean isRunning() { return active != null || preparing; }
    public boolean hasActiveSession() { return active != null; }
    public boolean isBackgroundAllowed() {
        return !(active == null ? PresetsService.getInstance().foregroundOnly() : active.foreground.foregroundOnly());
    }
    public void setBackgroundAllowed(boolean allowed) {
        ApplicationManager.getApplication().assertIsDispatchThread();
        Session s = active;
        if (s == null || disposed) return;
        long now = System.nanoTime();
        ForegroundGuard.State state = s.foreground.setForegroundOnly(!allowed, s.paused,
            s.clock.expired(now), IdeWindowState.isActive(), now);
        PresetsService.getInstance().setForegroundOnly(!allowed);
        if (state == ForegroundGuard.State.EXPIRED) { stop("Scheduled duration reached"); return; }
        // Keep the interval and explicit Pause. Never replay missed steps.
        report(s, reportState(s), "Background setting changed"); fire();
    }
    public boolean isPaused() { return active != null && active.paused; }
    public Path lastFolder() { return active == null ? lastFolder : active.folder; }
    public String status() {
        if (preparing) return "Preparing your sandbox…";
        Session s = active;
        if (s == null) return lastMessage;
        long now = System.nanoTime(), elapsed = s.clock.elapsedSeconds(now), left = s.clock.remainingSeconds(now);
        String state = s.paused ? "Paused" : s.foreground.state() == ForegroundGuard.State.WAITING_FOR_IDE ? "Waiting for IntelliJ" : IdeWindowState.isActive() ? "Running in foreground" : "Running in background";
        return state + " · Synthetic simulation\n\n" +
            "Selection: " + s.options.mode() +
            "\nLanguages: " + s.options.languages().size() + "\nCurrent language: " + s.currentLanguage +
            "\nPattern: " + s.options.pattern() + "\nInterval: " + s.options.intervalSeconds() + " seconds\n\n" +
            "Local additions: " + s.additions + "\nLocal deletions: " + s.deletions + "\nSteps: " + s.steps +
            "\nElapsed (total): " + duration(elapsed) + "\n" +
            "Running time: " + duration(s.foreground.runningSeconds(now)) + "\n" +
            "Waiting for IntelliJ: " + duration(s.foreground.waitingSeconds(now)) + "\n" +
            "Manually paused: " + duration(s.foreground.pausedSeconds(now)) + "\n" +
            (left < 0 ? "Until I Stop" : "Time left: " + (left + 59) / 60 + " minutes") +
            "\n\nBackground execution: " + (s.foreground.foregroundOnly() ? "Off" : "On") +
            "\nForeground steps: " + s.foregroundSteps + "\nBackground steps: " + s.backgroundSteps +
            (s.foreground.state() == ForegroundGuard.State.WAITING_FOR_IDE ?
                "\n\nReturn to IntelliJ, or enable Run in background below." : "") +
            "\n\nTimes describe the local simulation schedule, not verified coding work. No external tracking service is used.\n\nSandbox:\n" + s.folder;
    }
    public void start(SessionOptions options) {
        ApplicationManager.getApplication().assertIsDispatchThread();
        if (isRunning() || disposed) return;
        preparing = true; long token = ++generation; fire();
        worker.execute(() -> {
            Path folder = null;
            try {
                Path root = Path.of(PathManager.getSystemPath(), "activity-lab");
                folder = SandboxFiles.createSession(root, options);
                List<FileEntry> files = new ArrayList<>();
                for (LanguageProfile profile : options.languages()) {
                    FileSimulation simulation = new FileSimulation(profile);
                    files.add(new FileEntry(SandboxFiles.createFile(folder, profile, simulation.expected()), simulation));
                }
                Path ready = folder;
                if (disposed) { writeCancelled(ready); return; }
                ApplicationManager.getApplication().invokeLater(() -> {
                    if (disposed || project.isDisposed() || token != generation) {
                        worker.execute(() -> writeCancelled(ready)); return;
                    }
                    preparing = false; active = new Session(options, ready, files); lastFolder = ready;
                    PresetsService.getInstance().remember(options.languages());
                    PresetsService.getInstance().setForegroundOnly(options.foregroundOnly());
                    report(active, reportState(active), "Session started"); heartbeat();
                }, ModalityState.nonModal());
            } catch (Exception e) {
                if (folder != null) writeCancelled(folder);
                ApplicationManager.getApplication().invokeLater(() -> {
                    if (disposed || token != generation) return;
                    preparing = false; lastMessage = "Could not start: " + e.getMessage(); fire(); notifyError(lastMessage);
                }, ModalityState.nonModal());
            }
        });
    }
    private void heartbeat() {
        if (disposed || active == null) return;
        Session s = active;
        long now = System.nanoTime();
        ForegroundGuard.State previous = s.foreground.state();
        ForegroundGuard.State state = updateGate(s, now);
        if (state == ForegroundGuard.State.EXPIRED) { stop("Scheduled duration reached"); return; }
        if (previous != state) report(s, reportState(s), "Foreground state changed");
        if (state == ForegroundGuard.State.RUNNING && !busy && now >= s.nextEdit) step(s);
        fire();
        if (active == s) timer.addRequest(this::heartbeat, 1000, ModalityState.nonModal());
    }
    private ForegroundGuard.State updateGate(Session s, long now) {
        return s.foreground.update(s.paused, s.clock.expired(now), IdeWindowState.isActive(), now);
    }
    private static String reportState(Session s) {
        if (s.paused) return "paused";
        return s.foreground.state() == ForegroundGuard.State.WAITING_FOR_IDE ? "waiting_for_ide" : "running";
    }
    private void step(Session s) {
        busy = true;
        FileEntry entry = s.files.get(s.index % s.files.size());
        String expected = entry.simulation.expected();
        worker.execute(() -> {
            try {
                SandboxFiles.checkFile(s.folder, entry.path, expected);
                ApplicationManager.getApplication().invokeLater(() -> applyStep(s, entry), ModalityState.nonModal());
            } catch (Exception e) {
                ApplicationManager.getApplication().invokeLater(() -> {
                    if (active != s || disposed) return;
                    busy = false; stop("Protected stop: " + e.getMessage()); notifyError(e.getMessage());
                }, ModalityState.nonModal());
            }
        });
    }
    private void applyStep(Session s, FileEntry entry) {
        if (disposed || active != s) return;
        try {
            ForegroundGuard.State state = updateGate(s, System.nanoTime());
            if (state == ForegroundGuard.State.EXPIRED) { stop("Scheduled duration reached"); return; }
            if (state != ForegroundGuard.State.RUNNING) { report(s, reportState(s), "Edit deferred"); return; }
            VirtualFile file = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(entry.path);
            if (file == null || !file.isValid() || !file.isWritable()) throw new IllegalStateException("The sandbox file is unavailable or read only.");
            // Do not select or create editor tabs while the IDE is in the background.
            Document document = EditorOperations.open(project, file,
                s.options.openEditors() && IdeWindowState.isActive());
            FileSimulation.Plan plan = entry.simulation.plan(document.getText(), s.options.pattern(), s.sequence, s.totalBytes);
            // Opening an editor can process UI work. Check again before changing the document.
            state = updateGate(s, System.nanoTime());
            if (state == ForegroundGuard.State.EXPIRED) { stop("Scheduled duration reached"); return; }
            if (state != ForegroundGuard.State.RUNNING) { report(s, reportState(s), "Edit deferred"); return; }
            boolean foreground = IdeWindowState.isActive();
            EditorOperations.apply(project, document, entry.simulation, plan);
            entry.simulation.commit(plan);
            s.totalBytes += FileSimulation.bytes(plan.after()) - FileSimulation.bytes(plan.before());
            s.sequence = plan.sequence(); s.additions += plan.additions(); s.deletions += plan.deletions();
            s.steps++; s.index++; s.currentLanguage = entry.simulation.language().label();
            if (foreground) s.foregroundSteps++; else s.backgroundSteps++;
            s.nextEdit = System.nanoTime() + s.options.intervalSeconds() * 1_000_000_000L;
            report(s, "running", "Step completed");
        } catch (Exception e) { stop("Protected stop: " + e.getMessage()); notifyError(e.getMessage()); }
        finally { if (active == s) busy = false; fire(); }
    }
    public void togglePause() {
        if (active == null) return;
        active.paused = !active.paused;
        if (!active.paused) active.nextEdit = System.nanoTime();
        if (updateGate(active, System.nanoTime()) == ForegroundGuard.State.EXPIRED) { stop("Scheduled duration reached"); return; }
        report(active, reportState(active), "Pause state changed"); fire();
    }
    public void stop(String reason) {
        generation++; preparing = false; timer.cancelAllRequests();
        Session s = active; active = null; busy = false;
        if (s != null) {
            s.foreground.finish(System.nanoTime());
            synchronized (s) { s.terminal = true; }
            lastFolder = s.folder;
            lastMessage = "Session finished\n\n" + reason + "\n\nLocal additions: " + s.additions +
                "\nLocal deletions: " + s.deletions + "\nSteps: " + s.steps + "\n\nReport:\n" + s.folder.resolve("session-report.json");
            report(s, "stopped", reason);
        } else lastMessage = "Ready. No session is running.";
        fire();
    }
    private void report(Session s, String state, String reason) {
        // Serialize terminal-state checks with revision assignment. This prevents a concurrent
        // lifecycle callback from queueing a non-terminal snapshot after shutdown has begun.
        final long revision;
        synchronized (s) {
            if (s.terminal && !"stopped".equals(state)) return;
            revision = ++s.reportRevision;
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("type", "LOCAL_SYNTHETIC_TEST_REPORT"); data.put("schema_version", 4);
        data.put("plugin_version", IdeWindowState.pluginVersion()); data.put("editor", "IntelliJ IDEA");
        data.put("simulated_mode", s.options.mode());
        data.put("selected_languages", s.options.languages().stream().map(LanguageProfile::label).toList());
        data.put("files", s.files.stream().map(f -> Map.of("language", f.simulation.language().label(), "name", f.path.getFileName().toString())).toList());
        data.put("started_at", s.startedAt.toString()); data.put("updated_at", Instant.now().toString());
        data.put("started_at_local", s.startedAt.atZone(ZoneId.systemDefault()).toString());
        data.put("state", state); data.put("stop_reason", state.equals("stopped") ? reason : null);
        data.put("pattern", s.options.pattern().toString());
        data.put("synthetic_additions", s.additions); data.put("synthetic_deletions", s.deletions);
        data.put("synthetic_steps", s.steps); data.put("elapsed_wall_clock_seconds", s.clock.elapsedSeconds(System.nanoTime()));
        data.put("note", "Logical placeholder records from a standalone local simulation. They are not physical diff lines or verified coding hours. Paused and waiting time are included in scheduled duration. Running time includes edit intervals and scheduler delays.");
        String json = new GsonBuilder().setPrettyPrinting().serializeNulls().create().toJson(data) + "\n";
        worker.execute(() -> {
            // Drop stale snapshots before touching disk. Since this task and the terminal
            // report share the ordered worker, the newest revision is the final persisted state.
            if (revision != s.reportRevision) return;
            try { SandboxFiles.writeReport(s.folder, json); }
            catch (Exception e) { if (!disposed) ApplicationManager.getApplication().invokeLater(() -> notifyError("Could not save report: " + e.getMessage())); }
        });
    }
    /** Local scheduler snapshot for automated tests and support; it never inspects other plugins. */
    public String diagnostics() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("activity_lab_version", IdeWindowState.pluginVersion());
        result.put("collected_at_local", ZonedDateTime.now().toString());
        result.put("current_environment", Map.of(
            "ide_window_active", IdeWindowState.isActive(),
            "local_time_zone", ZoneId.systemDefault().getId()));
        Session s = active;
        if (s != null) {
            long now = System.nanoTime();
            result.put("session_state", reportState(s));
            Map<String, Object> local = new LinkedHashMap<>();
            local.put("background_execution_enabled", !s.foreground.foregroundOnly());
            local.put("running_seconds", s.foreground.runningSeconds(now));
            local.put("waiting_seconds", s.foreground.waitingSeconds(now));
            local.put("manually_paused_seconds", s.foreground.pausedSeconds(now));
            local.put("foreground_steps", s.foregroundSteps);
            local.put("background_steps", s.backgroundSteps);
            local.put("synthetic_steps", s.steps);
            local.put("synthetic_additions", s.additions);
            local.put("synthetic_deletions", s.deletions);
            result.put("session_diagnostics", local);
        }
        return new GsonBuilder().setPrettyPrinting().serializeNulls().create().toJson(result);
    }
    private static String duration(long seconds) { return seconds / 60 + "m " + seconds % 60 + "s"; }
    private static void writeCancelled(Path folder) {
        try { SandboxFiles.writeReport(folder, "{\"type\":\"LOCAL_SYNTHETIC_TEST_REPORT\",\"schema_version\":4,\"state\":\"cancelled\",\"note\":\"Standalone local simulation setup was cancelled.\"}\n"); }
        catch (Exception ignored) { /* Partial setup contains only isolated files. */ }
    }
    private void notifyError(String message) {
        if (!disposed && !project.isDisposed()) NotificationGroupManager.getInstance().getNotificationGroup("Activity Lab")
            .createNotification("Activity Lab", message, NotificationType.WARNING).notify(project);
    }
    private void fire() { if (!disposed) listeners.forEach(Runnable::run); }
    @Override public void dispose() {
        disposed = true; generation++; timer.cancelAllRequests();
        Session s = active; active = null;
        if (s != null) {
            s.foreground.finish(System.nanoTime());
            synchronized (s) { s.terminal = true; }
            report(s, "stopped", "Project closed or plugin unloaded");
        }
        listeners.clear();
        // Application executor owns its threads. Ordered writes already queued are allowed to finish.
    }
}
