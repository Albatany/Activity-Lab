package dev.albatany.activitylab;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.*;
import dev.albatany.activitylab.core.*;
import org.jetbrains.annotations.NotNull;
import java.util.*;

@Service(Service.Level.APP)
@State(name = "ActivityLabSavedLanguages", storages = @Storage(value = "activityLab.xml", roamingType = RoamingType.DISABLED))
public final class PresetsService implements PersistentStateComponent<PresetsService.Data> {
    public static final class SavedPreset {
        public String name = "";
        public List<String> languages = new ArrayList<>();
        public SavedPreset() {}
        SavedPreset(PresetBook.Preset preset) {
            name = preset.name(); languages = new ArrayList<>(preset.languages());
        }
    }
    public static final class Data {
        public List<SavedPreset> presets = new ArrayList<>();
        public List<String> lastLanguages = new ArrayList<>();
        public boolean foregroundOnly = true;
        public Data() {}
    }
    private Data data = new Data();
    public static PresetsService getInstance() { return ApplicationManager.getApplication().getService(PresetsService.class); }
    @Override public synchronized @NotNull Data getState() { return data; }
    @Override public synchronized void loadState(@NotNull Data state) {
        data = new Data();
        data.foregroundOnly = state.foregroundOnly;
        if (state.lastLanguages != null)
            data.lastLanguages = new ArrayList<>(Catalog.resolve(state.lastLanguages).stream().limit(48).map(LanguageProfile::label).toList());
        List<PresetBook.Preset> cleaned = new ArrayList<>();
        if (state.presets != null) for (SavedPreset raw : state.presets) {
            try {
                if (raw != null) cleaned = new ArrayList<>(PresetBook.save(cleaned, new PresetBook.Preset(raw.name, raw.languages), false));
            } catch (IllegalArgumentException ignored) { /* Ignore obsolete or corrupt entries only. */ }
        }
        setPresets(cleaned);
    }
    public synchronized List<PresetBook.Preset> presets() {
        return data.presets.stream().map(p -> new PresetBook.Preset(p.name, p.languages)).toList();
    }
    public synchronized List<String> lastLanguages() { return List.copyOf(data.lastLanguages); }
    public synchronized boolean foregroundOnly() { return data.foregroundOnly; }
    public synchronized void setForegroundOnly(boolean value) { data.foregroundOnly = value; }
    public synchronized void remember(List<LanguageProfile> languages) {
        data.lastLanguages = new ArrayList<>(languages.stream().map(LanguageProfile::label).toList());
    }
    public synchronized void save(String name, List<LanguageProfile> languages, boolean replace) {
        setPresets(PresetBook.save(presets(), new PresetBook.Preset(name, languages.stream().map(LanguageProfile::label).toList()), replace));
    }
    public synchronized void rename(String oldName, String newName) { setPresets(PresetBook.rename(presets(), oldName, newName)); }
    public synchronized void delete(String name) { setPresets(PresetBook.delete(presets(), name)); }
    private void setPresets(List<PresetBook.Preset> values) {
        data.presets = new ArrayList<>(values.stream().map(SavedPreset::new).toList());
    }
}
