package dev.albatany.activitylab;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.intellij.openapi.application.PathManager;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.vfs.newvfs.impl.VfsRootAccess;
import com.intellij.testFramework.fixtures.BasePlatformTestCase;
import com.intellij.util.ui.UIUtil;
import dev.albatany.activitylab.core.*;
import java.nio.file.*;
import java.util.List;
import java.util.function.BooleanSupplier;

/** Exercises the real scheduler, document saves, and live background preference in a headless IDE. */
public final class BackgroundSessionTest extends BasePlatformTestCase {
    public void testInactiveIdeCanResumeLocalStepsWithoutOpeningEditors() throws Exception {
        assertFalse("This integration test needs an inactive IDE window", IdeWindowState.isActive());
        // The platform test sandbox denies VFS access outside declared test roots.
        // Permit only the production session directory, scoped to this test's lifetime.
        VfsRootAccess.allowRootAccess(getTestRootDisposable(), Path.of(PathManager.getSystemPath(), "activity-lab").toString());
        SessionService service = SessionService.getInstance(getProject());
        PresetsService presets = PresetsService.getInstance();
        boolean oldPreference = presets.foregroundOnly();
        List<String> oldLanguages = presets.lastLanguages();
        var originalEditors = List.of(FileEditorManager.getInstance(getProject()).getOpenFiles());
        Path folder = null;
        try {
            service.start(new SessionOptions(Catalog.resolve(List.of("SQL")), "Single",
                1, 15, EditPattern.BALANCED, true, true));
            await(() -> service.hasActiveSession(), 15);
            folder = service.lastFolder();
            assertEquals("waiting_for_ide", root(service).get("session_state").getAsString());
            assertEquals(0, stats(service).get("background_steps").getAsLong());
            service.setBackgroundAllowed(true);
            await(() -> stats(service).get("background_steps").getAsLong() >= 1, 15);
            assertFalse(presets.foregroundOnly());
            assertTrue(service.status().contains("Running in background"));
            assertTrue(service.status().contains("Running time:"));
            assertEquals(originalEditors, List.of(FileEditorManager.getInstance(getProject()).getOpenFiles()));
            try (var files = Files.list(folder)) {
                Path sql = files.filter(p -> p.toString().endsWith(".sql")).findFirst().orElseThrow();
                assertTrue("The SQL edit was saved to disk", Files.readString(sql).contains("AS synthetic_step_"));
            }
            assertEquals(0, stats(service).get("foreground_steps").getAsLong());

            service.togglePause();
            long steps = stats(service).get("background_steps").getAsLong();
            service.setBackgroundAllowed(false);
            service.setBackgroundAllowed(true);
            assertTrue(service.isPaused());
            assertEquals("paused", root(service).get("session_state").getAsString());
            assertEquals(steps, stats(service).get("background_steps").getAsLong());
            service.setBackgroundAllowed(false);
            service.togglePause();
            assertEquals("waiting_for_ide", root(service).get("session_state").getAsString());
            assertTrue(presets.foregroundOnly());
            // Resume the same session; the original folder and counters survive.
            service.setBackgroundAllowed(true);
            await(() -> stats(service).get("background_steps").getAsLong() > steps, 15);
            assertEquals(folder, service.lastFolder());
            assertEquals(originalEditors, List.of(FileEditorManager.getInstance(getProject()).getOpenFiles()));
            service.stop("Integration test complete");
            Path report = folder.resolve("session-report.json");
            await(() -> stopped(report), 15);
            JsonObject saved = JsonParser.parseString(Files.readString(report)).getAsJsonObject();
            assertEquals("stopped", saved.get("state").getAsString());
            assertEquals(4, saved.get("schema_version").getAsInt());
            assertTrue(saved.get("synthetic_steps").getAsLong() > 0);
        } finally {
            if (service.isRunning()) service.stop("Test cleanup");
            presets.setForegroundOnly(oldPreference);
            presets.remember(Catalog.resolve(oldLanguages));
            if (folder != null) {
                Path report = folder.resolve("session-report.json");
                // Regression guard: stale queued snapshots must never replace the terminal report.
                await(() -> stopped(report), 15);
                try (var paths = Files.walk(folder)) {
                    for (Path path : paths.sorted(java.util.Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
                }
            }
        }
    }

    private static JsonObject root(SessionService service) {
        return JsonParser.parseString(service.diagnostics()).getAsJsonObject();
    }
    private static JsonObject stats(SessionService service) { return root(service).getAsJsonObject("session_diagnostics"); }
    private static boolean stopped(Path report) {
        try { return JsonParser.parseString(Files.readString(report)).getAsJsonObject().get("state").getAsString().equals("stopped"); }
        catch (Exception ignored) { return false; }
    }
    private static void await(BooleanSupplier condition, int seconds) throws Exception {
        long end = System.nanoTime() + seconds * 1_000_000_000L;
        while (!condition.getAsBoolean() && System.nanoTime() < end) {
            UIUtil.dispatchAllInvocationEvents();
            Thread.sleep(10);
        }
        assertTrue("Timed out waiting for the background session", condition.getAsBoolean());
    }
}
