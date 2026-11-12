package dev.albatany.activitylab;

import com.intellij.util.xmlb.XmlSerializer;
import dev.albatany.activitylab.core.Catalog;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class PresetStateTest {
    @Test void savedLanguagesSurviveIntellijXmlSerialization() {
        PresetsService first = new PresetsService();
        first.save("My Stack", Catalog.resolve(List.of("Java", "Kotlin", "SQL")), false);
        first.remember(Catalog.resolve(List.of("Python", "Markdown")));
        first.setForegroundOnly(false);
        var xml = XmlSerializer.serialize(first.getState());
        var state = XmlSerializer.deserialize(xml, PresetsService.Data.class);
        PresetsService reloaded = new PresetsService(); reloaded.loadState(state);
        assertEquals(List.of("Java", "Kotlin", "SQL"), reloaded.presets().getFirst().languages());
        assertEquals(List.of("Python", "Markdown"), reloaded.lastLanguages());
        assertFalse(reloaded.foregroundOnly());
        reloaded.rename("My Stack", "Backend"); reloaded.delete("Backend"); assertTrue(reloaded.presets().isEmpty());
    }
    @Test void oldPresetXmlRetainsLanguagesAndDefaultsToForegroundWaiting() {
        var xml = new org.jdom.Element("state");
        var option = new org.jdom.Element("option").setAttribute("name", "lastLanguages");
        option.addContent(new org.jdom.Element("list").addContent(new org.jdom.Element("option").setAttribute("value", "Java")));
        xml.addContent(option);
        var old = XmlSerializer.deserialize(xml, PresetsService.Data.class);
        PresetsService service = new PresetsService(); service.loadState(old);
        assertEquals(List.of("Java"), service.lastLanguages());
        assertTrue(service.foregroundOnly());
    }
    @Test void corruptPresetDoesNotDiscardValidPresets() {
        PresetsService.Data raw = new PresetsService.Data();
        PresetsService.SavedPreset valid = new PresetsService.SavedPreset(); valid.name = "Valid"; valid.languages = List.of("Java");
        PresetsService.SavedPreset invalid = new PresetsService.SavedPreset(); invalid.name = "Invalid/Name"; invalid.languages = List.of("Java");
        raw.presets.add(valid); raw.presets.add(invalid); raw.presets.add(null);
        PresetsService state = new PresetsService(); state.loadState(raw);
        assertEquals(1, state.presets().size()); assertEquals("Valid", state.presets().getFirst().name());
    }
}
