package dev.albatany.activitylab.core;

import com.google.gson.GsonBuilder;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Logical placeholder records are not physical diff lines or tracker metrics. */
public final class FileSimulation {
    private static final String MARKER = "ACTIVITY LAB SYNTHETIC SIMULATION";
    public static final long MAX_FILE_BYTES = 2_000_000, MAX_SESSION_BYTES = 10_000_000;
    public record Plan(String before, String after, int removeCharacters, String appended,
                       List<String> records, int additions, int deletions, long sequence) {}
    private final LanguageProfile language;
    private final String header;
    private List<String> records = List.of();
    private String expected;
    public FileSimulation(LanguageProfile language) {
        this.language = language; this.header = header(language); this.expected = render(records);
    }
    public LanguageProfile language() { return language; }
    public String expected() { return expected; }
    public int headerLength() { return header.length(); }
    public boolean isJson() { return language.comment().equals("json"); }
    public Plan plan(String current, EditPattern pattern, long sequence, long totalBytes) {
        if (!expected.equals(current)) throw new IllegalStateException("A sandbox file changed outside this session. Your changes have been preserved.");
        int removed = Math.min(records.size(), pattern.deletions);
        List<String> next = new ArrayList<>(records.subList(removed, records.size()));
        StringBuilder appended = new StringBuilder();
        for (int i = 0; i < pattern.additions; i++) {
            String record = record(++sequence);
            next.add(record); appended.append(record);
        }
        String after = render(next);
        if (bytes(after) > MAX_FILE_BYTES || totalBytes - bytes(expected) + bytes(after) > MAX_SESSION_BYTES)
            throw new IllegalStateException("Storage limit reached: 2 MB per file or 10 MB per session.");
        int removeCharacters = records.subList(0, removed).stream().mapToInt(String::length).sum();
        return new Plan(expected, after, removeCharacters, appended.toString(), List.copyOf(next), pattern.additions, removed, sequence);
    }
    public void commit(Plan plan) {
        if (!expected.equals(plan.before())) throw new IllegalStateException("Stale edit plan.");
        records = plan.records(); expected = plan.after();
    }
    public static long bytes(String text) { return text.getBytes(StandardCharsets.UTF_8).length; }
    private String render(List<String> entries) {
        if (!isJson()) return header + String.join("", entries);
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("_activity_lab", MARKER);
        json.put("entries", entries);
        return new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create().toJson(json) + "\n";
    }
    private String record(long n) {
        long value = (n % 57 + 5) * (n % 23 + 2);
        if (isJson()) return "synthetic_line_" + n;
        if (language.comment().equals("csv")) return "synthetic_step_" + n + "," + value + "\n";
        return switch (language.id()) {
            case "python" -> "synthetic_step_" + n + " = " + value + "\n";
            case "javascript", "javascriptreact" -> "const syntheticStep" + n + " = " + value + ";\n";
            case "typescript", "typescriptreact" -> "const syntheticStep" + n + ": number = " + value + ";\n";
            case "sql" -> "SELECT " + value + " AS synthetic_step_" + n + ";\n";
            case "java" -> "class SyntheticStep" + n + " { static final int value = " + value + "; }\n";
            case "kotlin" -> "val syntheticStep" + n + " = " + value + "\n";
            case "c", "cpp" -> "int synthetic_step_" + n + " = " + value + ";\n";
            case "go" -> "var syntheticStep" + n + " = " + value + "\n";
            case "rust" -> "const SYNTHETIC_STEP_" + n + ": i32 = " + value + ";\n";
            case "shellscript" -> "synthetic_step_" + n + "=" + value + "\n";
            case "powershell" -> "$syntheticStep" + n + " = " + value + "\n";
            case "html" -> "<p data-synthetic=\"true\">Simulation " + n + "</p>\n";
            default -> comment(language.comment(), "synthetic step " + n);
        };
    }
    private static String header(LanguageProfile p) {
        if (p.comment().equals("csv")) return "synthetic_test,value\n";
        if (p.comment().equals("json")) return "";
        return comment(p.comment(), MARKER);
    }
    private static String comment(String style, String text) {
        return switch (style) {
            case "html", "xml", "markdown" -> "<!-- " + text + " -->\n";
            case "css" -> "/* " + text + " */\n";
            case "slash" -> "// " + text + "\n";
            case "sql", "dash" -> "-- " + text + "\n";
            case "semi" -> "; " + text + "\n";
            case "percent" -> "% " + text + "\n";
            case "bang" -> "! " + text + "\n";
            case "paren" -> "(* " + text + " *)\n";
            case "brace" -> "{ " + text + " }\n";
            case "star" -> "* " + text + "\n";
            case "quote" -> "' " + text + "\n";
            case "rem" -> "REM " + text + "\n";
            default -> "# " + text + "\n";
        };
    }
}
