package dev.albatany.activitylab.core;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

public final class SandboxFiles {
    private SandboxFiles() {}
    public static Path createSession(Path root, SessionOptions options) throws IOException {
        Files.createDirectories(root);
        rejectLinks(root);
        Path session = Files.createTempDirectory(root, "session_");
        Files.writeString(session.resolve("ABOUT_SIMULATION.txt"),
            "Activity Lab by Albatany\nSynthetic editor test files for local simulation only. No external activity service is contacted.\n© Albatany 2026\n",
            StandardCharsets.UTF_8, StandardOpenOption.CREATE_NEW);
        return session;
    }
    public static Path createFile(Path session, LanguageProfile language, String text) throws IOException {
        checkDirectory(session);
        List<String> stems = Catalog.stems(language);
        String stem = stems.get(java.util.concurrent.ThreadLocalRandom.current().nextInt(stems.size()));
        Path file = session.resolve(stem + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12) + language.ext());
        Files.writeString(file, text, StandardCharsets.UTF_8, StandardOpenOption.CREATE_NEW);
        return file;
    }
    public static void checkFile(Path session, Path file, String expected) throws IOException {
        checkDirectory(session);
        if (!file.toAbsolutePath().normalize().getParent().equals(session.toAbsolutePath().normalize()))
            throw new IOException("The file is outside the session sandbox.");
        if (!Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS) || Files.isSymbolicLink(file))
            throw new IOException("The sandbox file was removed or replaced by a link.");
        // IntelliJ normalizes document line endings to LF. Preserve Windows CRLF files.
        if (Files.size(file) > FileSimulation.MAX_FILE_BYTES || !Files.readString(file).replace("\r\n", "\n").equals(expected))
            throw new IOException("A sandbox file changed on disk. Your changes have been preserved.");
    }
    private static void checkDirectory(Path session) throws IOException {
        rejectLinks(session);
        if (!Files.isDirectory(session, LinkOption.NOFOLLOW_LINKS)) throw new IOException("The sandbox folder no longer exists.");
    }
    private static void rejectLinks(Path path) throws IOException {
        for (Path item = path.toAbsolutePath(); item != null; item = item.getParent())
            if (Files.isSymbolicLink(item)) throw new IOException("The sandbox path cannot contain symbolic links.");
    }
    public static void writeReport(Path folder, String json) throws IOException {
        checkDirectory(folder);
        Path temp = Files.createTempFile(folder, "report_", ".tmp");
        try {
            Files.writeString(temp, json, StandardCharsets.UTF_8);
            try { Files.move(temp, folder.resolve("session-report.json"), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING); }
            catch (AtomicMoveNotSupportedException e) { Files.move(temp, folder.resolve("session-report.json"), StandardCopyOption.REPLACE_EXISTING); }
        } finally { Files.deleteIfExists(temp); }
    }
}
