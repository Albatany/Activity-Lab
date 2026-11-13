# Activity Lab Standalone 6.1.2 — Source Kit

This package contains the cleaned source for VS Code 6.1.2, IntelliJ IDEA 6.1.2, and the Arduino Uno companion.

## Installable packages

- VS Code: `Activity-Lab/release/activity-lab-standalone-6.1.2.vsix` — ready for **Install from VSIX**.
- Arduino Uno: `Activity-Lab/release/Activity-Lab-Arduino-Companion-6.1.0.zip` — extract, open the included `.ino` sketch in Arduino IDE 2, and use the included local Arduino CLI scripts for compile/upload. This is not a native IDE plugin.
- IntelliJ IDEA: source included under `Activity-Lab/intellij`. The installable plugin ZIP has not been generated in this environment because the Gradle 9.0 distribution could not be downloaded (network/DNS unavailable). Build it with JDK 21 and `./gradlew test buildPlugin`; then install `intellij/build/distributions/activity-lab-6.1.2.zip`.

## Validation performed

- IntelliJ source corrections: removed obsolete `documentEvents` / `saveEvents` diagnostics, restored the required IntelliJ `Document` import for local editor operations, and added revision-guarded asynchronous report writes so stale queued snapshots cannot overwrite a terminal `stopped` report.

- VS Code: `npm test` — PASS (all tests); rechecked during 6.1.2 editor-event compatibility update packaging.
- VS Code: `npm run check` — PASS; rechecked during 6.1.2 editor-event compatibility update packaging.
- Arduino Bash helper: `bash -n` — PASS; CLI workflow smoke-tested with a stub CLI only.
- Arduino hardware upload: NOT tested on a physical Uno.
- IntelliJ: Java compilation progressed successfully on the user's Windows machine after the source corrections. The latest user-side run reached tests and exposed a report-ordering race in the background-session integration test; 6.1.2 editor-event compatibility update addresses this by discarding stale queued report snapshots and protecting terminal state. A fresh Gradle run in this environment is BLOCKED before configuration because `services.gradle.org` cannot be resolved; no IntelliJ installer is included.

© Albatany 2026 — Push the limits.
