# IntelliJ IDEA Guide

## Installation

Build the plugin with JDK 21 using `cd intellij` and `./gradlew test buildPlugin` (Windows: `gradlew.bat test buildPlugin`). Install the generated `intellij/build/distributions/activity-lab-6.1.0.zip` through **Settings → Plugins → gear menu → Install Plugin from Disk...**, then restart if requested.

## Start a session

Open the **Activity Lab** tool window or use **Tools → Activity Lab → Start Simulation**. The session dialog supports:

- 141 bundled offline language/file profiles.
- 32 curated professional modes.
- Custom Language Selection (up to 48 profiles per session).
- Saved Languages presets.
- Custom File Profiles.
- Timed sessions up to 480 minutes or **Until I Stop**.
- Balanced, Additions Favored, and Strongly Favored local edit patterns.

Choose an interval of 15, 30, 60, or 120 seconds. Choose whether to open generated editor tabs and whether local simulation should continue while IntelliJ is in the background.

## Controls and reports

The Activity Lab tool window provides New Simulation, Saved Languages, Pause/Resume, Stop, and Open Session Folder. The sandbox includes `ABOUT_SIMULATION.txt` and a local `session-report.json` with language selections, local counters, state, and timestamps.

Background mode changes only Activity Lab's local scheduler. It does not open the application, send events to other software, or claim that an external service accepted activity.

© Albatany 2026.
