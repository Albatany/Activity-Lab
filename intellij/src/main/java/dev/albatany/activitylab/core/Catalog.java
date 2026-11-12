package dev.albatany.activitylab.core;

import com.google.gson.Gson;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public final class Catalog {
    public record Mode(String title, String category, String summary, List<String> languages) {
        @Override public String toString() { return title; }
    }
    private record Names(Map<String, List<String>> stems, List<String> generic) {}
    private static final Gson JSON = new Gson();
    private static final List<LanguageProfile> LANGUAGES = List.of(read("languages.json", LanguageProfile[].class));
    private static final List<Mode> MODES = List.of(read("modes.json", Mode[].class));
    private static final Names NAMES = read("filenames.json", Names.class);
    private Catalog() {}
    private static <T> T read(String file, Class<T> type) {
        try (InputStream input = Catalog.class.getResourceAsStream("/catalog/" + file)) {
            if (input == null) throw new IllegalStateException("Missing catalog: " + file);
            return JSON.fromJson(new InputStreamReader(input, StandardCharsets.UTF_8), type);
        } catch (IOException e) { throw new IllegalStateException("Cannot read the language catalog.", e); }
    }
    public static List<LanguageProfile> languages() { return LANGUAGES; }
    public static List<Mode> modes() { return MODES; }
    public static List<LanguageProfile> resolve(Collection<String> labels) {
        LinkedHashMap<String, LanguageProfile> result = new LinkedHashMap<>();
        if (labels != null) for (String label : labels) {
            LANGUAGES.stream().filter(p -> p.label().equalsIgnoreCase(label)).findFirst()
                .ifPresent(p -> result.put(p.label(), p));
        }
        return List.copyOf(result.values());
    }
    public static List<String> stems(LanguageProfile language) {
        return NAMES.stems().getOrDefault(language.id(), NAMES.generic());
    }
}
