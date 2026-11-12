package dev.albatany.activitylab.core;

import java.util.*;

/** Immutable operations make failed renames and duplicate saves non-destructive. */
public final class PresetBook {
    public static final int MAX_PRESETS = 20;
    public record Preset(String name, List<String> languages) {
        public Preset {
            name = SessionOptions.validateName(name, 40, "Preset name", false);
            languages = Catalog.resolve(languages).stream().map(LanguageProfile::label).toList();
            if (languages.isEmpty() || languages.size() > SessionOptions.MAX_LANGUAGES)
                throw new IllegalArgumentException("A preset must contain between 1 and 48 built-in languages.");
        }
        @Override public String toString() { return name + " (" + languages.size() + " languages)"; }
    }
    private PresetBook() {}
    public static List<Preset> save(List<Preset> existing, Preset preset, boolean replace) {
        List<Preset> result = new ArrayList<>(existing);
        int index = indexOf(result, preset.name());
        if (index >= 0 && !replace) throw new IllegalArgumentException("A preset with this name already exists.");
        if (index >= 0) result.set(index, preset);
        else {
            if (result.size() >= MAX_PRESETS) throw new IllegalArgumentException("You can save up to 20 language presets.");
            result.add(preset);
        }
        return List.copyOf(result);
    }
    public static List<Preset> rename(List<Preset> existing, String oldName, String newName) {
        int index = indexOf(existing, oldName);
        if (index < 0) throw new IllegalArgumentException("The preset no longer exists.");
        Preset renamed = new Preset(newName, existing.get(index).languages());
        int collision = indexOf(existing, renamed.name());
        if (collision >= 0 && collision != index) throw new IllegalArgumentException("A preset with this name already exists.");
        List<Preset> result = new ArrayList<>(existing);
        result.set(index, renamed);
        return List.copyOf(result);
    }
    public static List<Preset> delete(List<Preset> existing, String name) {
        return existing.stream().filter(p -> !p.name().equalsIgnoreCase(name.trim())).toList();
    }
    private static int indexOf(List<Preset> list, String name) {
        for (int i = 0; i < list.size(); i++) if (list.get(i).name().equalsIgnoreCase(name.trim())) return i;
        return -1;
    }
}
