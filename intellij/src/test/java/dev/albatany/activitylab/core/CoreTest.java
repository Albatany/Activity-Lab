package dev.albatany.activitylab.core;

import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class CoreTest {
    @TempDir Path temp;
    private LanguageProfile language(String label) { return Catalog.resolve(List.of(label)).getFirst(); }
    private SessionOptions options(int minutes) {
        return new SessionOptions(List.of(language("Python")), "Custom", minutes, 15, EditPattern.BALANCED, true);
    }
    @Test void catalogKeepsAllV5ProfilesAndModes() {
        assertEquals(141, Catalog.languages().size()); assertEquals(32, Catalog.modes().size());
        assertEquals(141, Catalog.languages().stream().map(LanguageProfile::label).distinct().count());
        for (Catalog.Mode mode : Catalog.modes()) assertEquals(mode.languages().size(), Catalog.resolve(mode.languages()).size(), mode.title());
    }
    @Test void generatedFilenameStemsAvoidLogLikePaths() {
        for (LanguageProfile profile : Catalog.languages()) {
            for (String stem : Catalog.stems(profile)) {
                assertFalse(stem.toLowerCase(Locale.ROOT).contains("log"),
                    profile.label() + " generated filename stem must not contain the log substring: " + stem);
            }
        }
    }
    @Test void balancedPatternHasCorrectWarmupAndSteadyState() {
        FileSimulation simulation = new FileSimulation(language("Python"));
        FileSimulation.Plan first = simulation.plan(simulation.expected(), EditPattern.BALANCED, 0, 0);
        assertEquals(4, first.additions()); assertEquals(0, first.deletions()); simulation.commit(first);
        FileSimulation.Plan second = simulation.plan(simulation.expected(), EditPattern.BALANCED, first.sequence(), FileSimulation.bytes(first.after()));
        assertEquals(4, second.additions()); assertEquals(4, second.deletions()); assertEquals(4, second.records().size());
        assertFalse(second.after().contains("synthetic_step_1 ="));
        assertTrue(second.after().contains("synthetic_step_8 ="));
    }
    @Test void favoredPatternsAccumulateExpectedRecords() {
        for (EditPattern pattern : List.of(EditPattern.MORE, EditPattern.HEAVY)) {
            FileSimulation simulation = new FileSimulation(language("SQL"));
            long sequence = 0, additions = 0, deletions = 0;
            for (int i = 0; i < 10; i++) {
                var plan = simulation.plan(simulation.expected(), pattern, sequence, FileSimulation.bytes(simulation.expected()));
                simulation.commit(plan); sequence = plan.sequence(); additions += plan.additions(); deletions += plan.deletions();
            }
            assertEquals(pattern.additions * 10, additions); assertEquals(9, deletions);
        }
    }
    @Test void allFileProfilesRenderAndJsonStaysValid() {
        for (LanguageProfile profile : Catalog.languages()) {
            FileSimulation simulation = new FileSimulation(profile);
            long sequence = 0;
            for (int i = 0; i < 4; i++) {
                var plan = simulation.plan(simulation.expected(), EditPattern.MORE, sequence, FileSimulation.bytes(simulation.expected()));
                simulation.commit(plan); sequence = plan.sequence();
                if (simulation.isJson()) assertTrue(JsonParser.parseString(simulation.expected()).getAsJsonObject().has("_activity_lab"));
                else assertTrue(simulation.expected().contains("SYNTHETIC") || profile.comment().equals("csv"), profile.label());
            }
        }
    }
    @Test void planStopsOnManualChangesWithoutMutatingExpectedText() {
        FileSimulation simulation = new FileSimulation(language("Python")); String before = simulation.expected();
        assertThrows(IllegalStateException.class, () -> simulation.plan(before + "my work\n", EditPattern.BALANCED, 0, 0));
        assertEquals(before, simulation.expected());
    }
    @Test void byteBudgetIncludesUtf8AndRejectsGrowth() {
        assertEquals(4, FileSimulation.bytes("😀"));
        FileSimulation simulation = new FileSimulation(language("Python"));
        assertThrows(IllegalStateException.class, () -> simulation.plan(simulation.expected(), EditPattern.HEAVY, 0, FileSimulation.MAX_SESSION_BYTES));
    }
    @Test void presetOperationsTrimDeduplicateAndProtectCollisions() {
        var preset = new PresetBook.Preset(" My Stack ", List.of("Python", "python", "SQL"));
        assertEquals("My Stack", preset.name()); assertEquals(List.of("Python", "SQL"), preset.languages());
        var list = PresetBook.save(List.of(), preset, false);
        assertThrows(IllegalArgumentException.class, () -> PresetBook.save(list, new PresetBook.Preset("my stack", List.of("Java")), false));
        var renamed = PresetBook.rename(list, "my stack", "New Stack");
        assertEquals("New Stack", renamed.getFirst().name()); assertEquals(2, renamed.getFirst().languages().size());
        assertTrue(PresetBook.delete(renamed, " new stack ").isEmpty());
        var replaced = PresetBook.save(list, new PresetBook.Preset("my stack", List.of("Java")), true);
        assertEquals(List.of("Java"), replaced.getFirst().languages());
        var two = PresetBook.save(list, new PresetBook.Preset("Other", List.of("Java")), false);
        assertThrows(IllegalArgumentException.class, () -> PresetBook.rename(two, "My Stack", "Other"));
        assertEquals("My Stack", two.getFirst().name());
    }
    @Test void presetAndSelectionLimitsAreEnforced() {
        List<PresetBook.Preset> presets = new ArrayList<>();
        for (int i = 0; i < 20; i++) presets = new ArrayList<>(PresetBook.save(presets, new PresetBook.Preset("Stack " + i, List.of("Java")), false));
        var full = List.copyOf(presets);
        assertThrows(IllegalArgumentException.class, () -> PresetBook.save(full, new PresetBook.Preset("Extra", List.of("SQL")), false));
        assertThrows(IllegalArgumentException.class, () -> new PresetBook.Preset("Empty", List.of("Unknown language")));
        assertThrows(IllegalArgumentException.class, () -> new PresetBook.Preset("Too many", Catalog.languages().subList(0, 49).stream().map(LanguageProfile::label).toList()));
    }
    @Test void durationAndPresetValidation() {
        assertEquals(480, options(480).minutes()); assertEquals(0, options(0).minutes());
        assertThrows(IllegalArgumentException.class, () -> options(481));
        assertThrows(IllegalArgumentException.class, () -> options(-1));
        assertThrows(IllegalArgumentException.class, () -> SessionOptions.validateName("../escape", 64, "Preset", true));
        assertThrows(IllegalArgumentException.class, () -> SessionOptions.validateName("Project\nInjected", 64, "Preset", true));
        assertThrows(IllegalArgumentException.class, () -> new LanguageProfile("Bad", "bad", ".txt/../outside", "Custom", "hash"));
        assertEquals("Riset Aziz", SessionOptions.validateName(" Riset Aziz ", 64, "Preset", true));
    }
    @Test void monotonicDeadlineIncludesPauseTimeAndUnlimitedNeverExpires() {
        long start = 10_000_000_000L;
        SessionClock clock = new SessionClock(1, start);
        assertFalse(clock.expired(start + 59_000_000_000L)); assertTrue(clock.expired(start + 60_000_000_000L));
        assertEquals(30, clock.remainingSeconds(start + 30_000_000_000L));
        SessionClock unlimited = new SessionClock(0, start);
        assertFalse(unlimited.expired(start + 1000_000_000_000_000L)); assertEquals(-1, unlimited.remainingSeconds(start));
    }
    @Test void sleepAndClockChangesCannotExtendScheduledSessions() {
        SessionClock clock = new SessionClock(1, 0, 1_000_000);
        assertTrue(clock.expired(1_000_000, 1_060_000));
        assertTrue(clock.expired(60_000_000_000L, 900_000));
        assertFalse(clock.expired(30_000_000_000L, 1_030_000));
    }
    @Test void diskChangesAndSymlinksDoNotOverwriteOutsideFiles() throws Exception {
        Path root = temp.resolve("root"), session = SandboxFiles.createSession(root, options(5));
        Path file = SandboxFiles.createFile(session, language("Python"), "expected");
        SandboxFiles.checkFile(session, file, "expected");
        Files.writeString(file, "manual work");
        assertThrows(java.io.IOException.class, () -> SandboxFiles.checkFile(session, file, "expected"));
        assertEquals("manual work", Files.readString(file));
        Path outside = temp.resolve("private.txt"); Files.writeString(outside, "do not touch");
        assertThrows(java.io.IOException.class, () -> SandboxFiles.checkFile(session, outside, "do not touch"));
        try {
            Files.delete(file); Files.createSymbolicLink(file, outside);
            assertThrows(java.io.IOException.class, () -> SandboxFiles.checkFile(session, file, "do not touch"));
            assertEquals("do not touch", Files.readString(outside));
        } catch (UnsupportedOperationException | java.nio.file.FileSystemException unavailable) {
            org.junit.jupiter.api.Assumptions.assumeTrue(false, "Symbolic links unavailable on this runner.");
        }
    }
    @Test void isolatedFoldersUniqueFilesAndAtomicReports() throws Exception {
        Path first = SandboxFiles.createSession(temp.resolve("root"), options(5));
        Path second = SandboxFiles.createSession(temp.resolve("root"), options(5));
        assertNotEquals(first, second);
        Set<Path> names = new HashSet<>();
        for (int i = 0; i < 50; i++) names.add(SandboxFiles.createFile(first, language("Python"), "test"));
        assertEquals(50, names.size());
        SandboxFiles.writeReport(first, "{\"state\":\"running\"}"); SandboxFiles.writeReport(first, "{\"state\":\"stopped\"}");
        assertEquals("stopped", JsonParser.parseString(Files.readString(first.resolve("session-report.json"))).getAsJsonObject().get("state").getAsString());
        try (var files = Files.list(first)) { assertFalse(files.anyMatch(p -> p.toString().endsWith(".tmp"))); }
    }
    @Test void windowsLineEndingsAreComparedAsEditorText() throws Exception {
        Path folder = SandboxFiles.createSession(temp.resolve("root"), options(5));
        Path file = SandboxFiles.createFile(folder, language("Python"), "header\r\nbody\r\n");
        SandboxFiles.checkFile(folder, file, "header\nbody\n");
        assertEquals("header\r\nbody\r\n", Files.readString(file));
    }
}
