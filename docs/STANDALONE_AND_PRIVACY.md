# Standalone Design and Privacy

Activity Lab is designed to operate locally and independently.

## Runtime boundaries

- No external tracking integration, tracking API endpoint, credentials, or project marker.
- No optional online language catalog. The 141 bundled language/file profiles are used offline.
- No inspection of other IDE plugins or applications.
- No telemetry, analytics endpoint, or upload of local reports.
- Session files and reports stay in the Activity Lab sandbox on the local machine.

The VS Code extension and IntelliJ plugin use their host editor APIs to create and update Activity Lab scratch files, open the selected editor documents, and save them locally. This naturally produces ordinary editor focus/change/save events. A separately installed coding-activity extension may observe those events independently; Activity Lab does not call its API, inspect its configuration, or change its settings. The Arduino companion invokes a locally installed Arduino CLI only when the user runs a compile or upload action.

## Data written locally

Each session may contain generated files, `ABOUT_SIMULATION.txt`, and a `session-report.json`. Reports include selected profile names, generated file names, timestamps, local edit counters, and completion state. They do not contain account credentials or external tracking results.

## Important distinction

Activity Lab counters describe synthetic placeholder operations. They are not physical source-code diffs, verified work hours, or proof of human activity. Generated files are visibly labelled as simulations and should not be presented as real professional work.

© Albatany 2026.

## Editor-event compatibility

Generated scratch filenames avoid the `log` substring to reduce collisions with third-party heuristics that attempt to identify tailed log files. This is a filename compatibility measure only: Activity Lab still opens, edits, and saves its local scratch documents through the normal IDE APIs. It cannot control how another extension or remote service classifies those events.
