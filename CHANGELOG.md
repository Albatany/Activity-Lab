# Changelog

All notable changes to Activity Lab are recorded here. This history describes **extension functionality**, not verified activity recorded by WakaTime or another tracking service.

## [5.0.0] — 2026-10-24

### Added

* **Custom Language Selection** with a searchable, multi-select picker for any combination of the 141 built in file profiles.
* Selection validation and deduplication, with up to 48 file profiles per session to reduce editor overhead.
* **Saved language presets** with descriptive names, persistent local VS Code storage, and a dedicated preset management command.
* Remembered selection for convenience when opening the multi-select picker again.
* `selection_type` and `selected_languages` fields in local session reports.
* Automated tests for multi-select, saved presets, English menus, and major regression scenarios.

### Changed

* **Complete English interface**, including the Command Palette, prompts, confirmation dialogs, status bar, safety notices, and session folder labels.
* Rewritten English README, getting started guide, privacy information, troubleshooting guide, and release instructions for international users.
* Translated the descriptions and categories for all 32 curated technology modes, plus line change labels and validation messages.
* Improved menu order by prioritizing custom language selection.

### Preserved

* All 32 profession-based tracks, the 141 offline profiles, optional online catalog, project labeling, randomized filenames, change patterns, eight-hour duration cap, and Until I Stop mode.
* The original extension identifier, `localdev.activity-lab-synthetic`, allowing an in-place VSIX update.
* Sandboxed file edits and local reports explicitly marked as synthetic.

### Compatibility

* A saved language preset is stored locally in the current VS Code installation and is not automatically synced across computers.
* Session metrics remain **local simulation counts**, not proof of WakaTime heartbeat acceptance.

## [4.0.0] — 2026-10-17

### Added

* 32 technology-oriented modes covering software engineering, data, AI, cybersecurity, cloud, and systems.
* Optional project naming through `.wakatime-project` inside the sandbox.
* Randomized, context-aware scratch filenames and expanded report metadata.
* Repository documentation, contributor guidance, security policy, MIT license, and CI tests.

### Changed

* More polished status messages and Bahasa Indonesia controls for the v4 interface.

## [3.0.0]

### Added

* Three synthetic change patterns: balanced 1:1, additions favored 4:1, and high growth 8:1.
* Local line change counters, report generation, and scratch file safety limits.

## [2.0.0]

### Added

* 141 built in language and file profiles, from Assembly and SQL to Bash, Markdown, Python, Rust, and TypeScript.
* Full Stack rotation, optional online WakaTime language catalog, and custom file type configuration.
* Session durations up to eight hours and Until I Stop.

## [1.0.0]

### Added

* Initial Windows and Linux VS Code sandbox activity simulator.
* Twelve built in profiles, Start, Stop, and Status commands, and adjustable session settings.
* Synthetic scratch files and project labeling.

**© Albatany 2026**
