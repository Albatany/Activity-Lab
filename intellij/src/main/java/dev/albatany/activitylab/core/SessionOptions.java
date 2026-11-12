package dev.albatany.activitylab.core;

import java.util.*;

public record SessionOptions(List<LanguageProfile> languages, String mode,
                             int minutes, int intervalSeconds, EditPattern pattern, boolean openEditors,
                             boolean foregroundOnly) {
    public static final int MAX_LANGUAGES = 48;
    public SessionOptions(List<LanguageProfile> languages, String mode,
                          int minutes, int intervalSeconds, EditPattern pattern, boolean openEditors) {
        this(languages, mode, minutes, intervalSeconds, pattern, openEditors, true);
    }
    public SessionOptions {
        languages = List.copyOf(new LinkedHashSet<>(Objects.requireNonNull(languages)));
        if (languages.isEmpty() || languages.size() > MAX_LANGUAGES)
            throw new IllegalArgumentException("Choose between 1 and 48 languages.");
        Objects.requireNonNull(mode); Objects.requireNonNull(pattern);
        if (minutes < 0 || minutes > 480) throw new IllegalArgumentException("Duration must be 1 to 480 minutes, or Until I Stop.");
        if (!List.of(15, 30, 60, 120).contains(intervalSeconds))
            throw new IllegalArgumentException("Choose an interval of 15, 30, 60, or 120 seconds.");
    }
    public static String validateName(String input, int max, String field, boolean allowEmpty) {
        String value = Objects.requireNonNullElse(input, "").trim();
        if (allowEmpty && value.isEmpty()) return value;
        if (value.isEmpty() || value.length() > max ||
            !value.matches("[\\p{L}\\p{N}][\\p{L}\\p{N} _().+]*"))
            throw new IllegalArgumentException(field + " must use 1 to " + max + " letters, numbers, spaces, underscores, dots, parentheses, or plus signs.");
        return value;
    }
}
