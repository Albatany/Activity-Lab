# Visual Studio Code Guide

## Installation

Install `release/activity-lab-standalone-6.1.0.vsix` using **Extensions → ... → Install from VSIX...**, then reload VS Code if requested.

## Starting a session

Run **Activity Lab: Start Simulation** from the Command Palette or select the Activity Lab status-bar item. Choose one of the following:

- Choose multiple languages from the 141 bundled offline profiles (up to 48 per session).
- Select one of the 32 Professional Modes.
- Reuse or manage Saved Languages presets.
- Choose one bundled language profile.
- Add a Custom File Type with an extension and installed VS Code syntax mode.

Choose a duration up to 480 minutes or **Until I stop**, then select a local edit pattern and interval.

## Controls

The Command Palette includes Start Simulation, Stop Simulation, Session Status, Saved Languages, Pause Simulation, Resume Simulation, Session Controls, and Open Session Report. While a session is active, the status-bar item opens the session controls.

## Patterns and reports

- **Balanced 1:1:** additions and deletions are balanced.
- **Additions Favored 4:1:** additions outweigh removals.
- **Strongly Favored 8:1:** additions substantially outweigh removals.

The session folder contains randomized scratch files, `ABOUT_SIMULATION.txt`, and `session-report.json`. Reports include selected language profiles, file names, session timestamps, state, local additions/deletions, and step counts. They do not contain tracker-verification fields.

## Local storage

Session files are written beneath `~/.vscode-activity-lab/` (the home directory of the current OS account). Activity Lab only edits files inside the session sandbox it created. If a generated file changes unexpectedly, the session stops rather than overwriting the unexpected content.

© Albatany 2026.
