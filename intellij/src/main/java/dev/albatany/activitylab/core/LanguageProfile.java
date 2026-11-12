package dev.albatany.activitylab.core;

import java.util.Objects;

public record LanguageProfile(String label, String id, String ext, String category, String comment) {
    public LanguageProfile {
        Objects.requireNonNull(label); Objects.requireNonNull(id);
        Objects.requireNonNull(category); Objects.requireNonNull(comment);
        if (label.isBlank() || label.length() > 80 || label.chars().anyMatch(Character::isISOControl))
            throw new IllegalArgumentException("Enter a language name with 1 to 80 characters.");
        if (ext == null || !ext.matches("\\.[a-zA-Z0-9][a-zA-Z0-9._+\\-]{0,24}"))
            throw new IllegalArgumentException("Enter a safe file extension, for example .py or .sql.");
    }
}
