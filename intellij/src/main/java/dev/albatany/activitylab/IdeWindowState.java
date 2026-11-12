package dev.albatany.activitylab;

import java.awt.KeyboardFocusManager;
import java.io.IOException;
import java.util.Properties;

/** Reads only the current IDE window state and this plugin's own build version. */
public final class IdeWindowState {
    private static final String VERSION = readVersion();
    private IdeWindowState() {}
    public static boolean isActive() {
        return KeyboardFocusManager.getCurrentKeyboardFocusManager().getActiveWindow() != null;
    }
    public static String pluginVersion() { return VERSION; }
    private static String readVersion() {
        try (var stream = IdeWindowState.class.getResourceAsStream("/META-INF/activity-lab-version.properties")) {
            if (stream != null) {
                Properties properties = new Properties(); properties.load(stream);
                return properties.getProperty("version", "development");
            }
        } catch (IOException ignored) { /* A version label must not block local sessions. */ }
        return "development";
    }
}
