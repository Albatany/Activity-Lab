# Getting Started

Activity Lab is a standalone local sandbox for controlled editor experiments. It generates clearly labelled scratch files in its own session directory and records local counters in `session-report.json`.

## Choose an edition

- **VS Code:** install the VSIX from `release/`.
- **IntelliJ IDEA:** install the plugin ZIP from `release/`.
- **Arduino IDE 2 + Uno:** open the companion `.ino` sketch in Arduino IDE and use the included CLI helper for compile/upload.

## First session in VS Code or IntelliJ

1. Start **Activity Lab: Start Simulation** (VS Code command palette) or **Activity Lab → Start Simulation** (IntelliJ).
2. Select one language, several offline profiles, a Saved Languages preset, or a curated professional mode.
3. Optionally add a custom file profile.
4. Choose a duration (1–480 minutes) or **Until I Stop**.
5. Choose an edit pattern and interval.
6. Start the session. All generated files are created in an Activity Lab sandbox folder.
7. Pause, resume, stop, or open the local JSON report using the platform controls.

## Safety and data

Generated edits are synthetic placeholders, not real coding work. They remain in a dedicated local folder. Activity Lab does not use external tracking APIs, collect API keys, inspect other plugins, or upload session reports.

© Albatany 2026.
