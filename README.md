# Activity Lab Standalone

**A local editor simulation toolkit by Albatany.** Activity Lab creates clearly labelled scratch files, applies controlled placeholder edits, and records local session reports. It does not connect to activity trackers or communicate with other editor plugins.

**Release:** 6.1.0 · **Platforms:** Visual Studio Code, IntelliJ IDEA, and Arduino IDE companion for Arduino Uno · **License:** MIT

© Albatany 2026 — Push the limits.

## What is included

| Package | Installable file | Purpose |
| --- | --- | --- |
| VS Code | `release/activity-lab-standalone-6.1.0.vsix` | Editor sandbox sessions, offline language profiles, presets, modes, pause/resume, and JSON reports |
| IntelliJ IDEA | Source included; build required | Native IDE plugin source with offline profiles, presets, foreground/background controls, and reports. The installable plugin ZIP must be built on a machine that can resolve Gradle/IntelliJ dependencies. |
| Arduino IDE 2 + Uno | `release/Activity-Lab-Arduino-Companion-6.1.0.zip` | Arduino Uno sketch template and local Arduino CLI compile/upload helper; not a native IDE plugin |

The Arduino companion is deliberately separate: Arduino IDE 2's documented third-party installation flow is for themes, not a general-purpose extension API. The companion opens `.ino` sketches in Arduino IDE and uses Arduino CLI for hardware compilation and upload. See [Arduino Companion Guide](docs/ARDUINO_COMPANION_GUIDE.md).

## Core capabilities

- 141 bundled language and file profiles, available offline.
- 32 curated professional modes.
- Custom Language Selection, Saved Languages, and reusable presets.
- Custom file profiles.
- Three local edit patterns: Balanced 1:1, Additions Favored 4:1, and Strongly Favored 8:1.
- Randomized scratch filenames and isolated session folders.
- Timed sessions from 1 to 480 minutes, or Until I Stop.
- Pause, resume, stop, and local JSON session reports.
- Size limits and file-integrity checks to protect manually changed scratch files.

## Standalone boundaries

Activity Lab has no external tracking integration, tracker API, API-key setting, project-name override, online language lookup, or inspection of other editor plugins. The bundled language catalog is the only catalog used by the VS Code and IntelliJ editions. Application runtime does not send session details or telemetry to an external service.

The local counters describe generated placeholder operations only. They are not physical source-code diffs, verified coding hours, or evidence of human work. Do not present generated sessions as real work history.

## Install

### Visual Studio Code

1. Open VS Code.
2. Open **Extensions** (`Ctrl+Shift+X`).
3. Select the `...` menu → **Install from VSIX...**.
4. Choose `activity-lab-standalone-6.1.0.vsix` and reload the window if prompted.

### IntelliJ IDEA

The IntelliJ plugin source is included, but a compatible installable ZIP has not yet been built in this environment because Gradle could not resolve its distribution. On a machine with JDK 21 and network access, build it first:

```bash
cd intellij
./gradlew test buildPlugin
```

On Windows, use `gradlew.bat test buildPlugin`. Then open **Settings → Plugins → gear menu → Install Plugin from Disk...** and select `intellij/build/distributions/activity-lab-6.1.0.zip`. Restart the IDE if prompted.

### Arduino IDE 2 + Arduino Uno

1. Extract `Activity-Lab-Arduino-Companion-6.1.0.zip`.
2. Open `arduino/ActivityLabUno/ActivityLabUno.ino` in Arduino IDE 2.
3. Install Arduino CLI and the Arduino AVR core if they are not already installed.
4. Use the companion's `activity-lab-arduino.ps1` (Windows) or `activity-lab-arduino.sh` (Linux/macOS) to list ports, compile, and upload. The upload command requires an explicit port and confirmation.
5. Full steps are in [Arduino Companion Guide](docs/ARDUINO_COMPANION_GUIDE.md).

## Build from source

VS Code:

```bash
npm ci
npm test
npm run check
npm run package
```

IntelliJ IDEA (JDK 21 required):

```bash
cd intellij
./gradlew test buildPlugin
```

On Windows use `gradlew.bat test buildPlugin`.

## Documentation

- [Getting started](docs/GETTING_STARTED.md)
- [VS Code guide](docs/VSCODE_GUIDE.md)
- [IntelliJ IDEA guide](docs/INTELLIJ_GUIDE.md)
- [IntelliJ background sessions](docs/INTELLIJ_BACKGROUND_GUIDE.md)
- [Arduino companion guide](docs/ARDUINO_COMPANION_GUIDE.md)
- [Standalone and privacy](docs/STANDALONE_AND_PRIVACY.md)
- [Validation](docs/VALIDATION.md)
- [IntelliJ 6.1.0 build correction](docs/INTELLIJ_BUILD_FIX_6.1.0.md)
- [GitHub release guide](docs/GITHUB_RELEASE_GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)



## Build the IntelliJ IDEA plugin on Windows

See [`docs/BUILD_INTELLIJ_WINDOWS.md`](docs/BUILD_INTELLIJ_WINDOWS.md) and run `Build-IntelliJ.ps1` from this folder.
