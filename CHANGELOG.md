# Changelog

## 6.1.2 — Editor-event compatibility

- Preserved native editor tabs, document edits, and local saves; the disk-only behaviour proposed in the earlier 6.1.1 experiment is not used in this release.
- Renamed generated ShellScript and Markdown scratch filename stems from `log_analysis` / `research_log` to `runtime_inspection` / `research_notes` to avoid the `log` substring that can collide with log-tail heuristics in separately installed IDE extensions.
- Added regression tests in VS Code and IntelliJ to prevent generated stems from reintroducing that substring.
- Clarified that independent editor extensions may observe normal IDE file events; Activity Lab still has no tracker API integration, does not inspect other extensions, and does not alter their settings or custom rules.

## 6.1.0 — Standalone Edition

- Removed all external-tracker code, endpoints, online catalog lookup, plugin inspection, project markers, UI labels, diagnostics, and report fields.
- Removed optional project-name override from VS Code and IntelliJ editions.
- Retained the bundled offline language profiles, curated professional modes, Saved Languages, custom file profiles, randomized filenames, local edit patterns, timed/indefinite sessions, pause/resume, local counters, and JSON reports.
- Preserved the IntelliJ foreground/background scheduler without any external tracker references.
- Corrected the IntelliJ standalone cleanup by removing a stale document/save-event status reference that belonged to the former tracker-diagnostics path; Activity Lab itself does not collect tracker metrics; normal editor events produced by opening, editing, and saving local scratch documents may still be observed by separately installed IDE extensions.
- Added the Arduino Uno companion bundle with local Arduino CLI compile/upload helpers.
- Updated documentation and release packaging for standalone operation.

## 6.0.2 — IntelliJ Background Scheduler

- Added an option to continue local simulation steps while IntelliJ IDEA is inactive.
- Separated running, waiting, and manually paused time in local session state.
- Kept the original session deadline when waiting or paused; missed steps are not replayed.
- Kept editor tabs unchanged during background steps.

## 6.0.1 — IntelliJ Session Reliability

- Added foreground-aware scheduling, local session-state reporting, and improved editor operations.
- Added tests for background scheduling, preset state, and editor file behaviour.

## 6.0.0 — Multi-language Sessions

- Added the IntelliJ edition, multi-language sessions, professional modes, Saved Languages, presets, local reports, and custom file profiles.
- Added durations up to eight hours and Until I Stop.

© Albatany 2026.
