# Validation

Release target: Activity Lab Standalone 6.1.0.

## Source-level checks

### VS Code

```bash
npm ci
npm test
npm run check
npm run package
```

Expected checks include JavaScript syntax, offline catalog selection, mode resolution, randomized file naming, local session patterns, session duration, pause/resume, and generated JSON reports.

### IntelliJ IDEA

```bash
cd intellij
./gradlew test buildPlugin
```

JDK 21 is required. The Gradle build needs a working network at least once to resolve the Gradle distribution, IntelliJ Platform, and Maven artifacts. In the build environment used to prepare this source bundle, Gradle could not be downloaded, so no installable IntelliJ ZIP is included yet. Runtime plugin features are local-only.

## Hardware checks still require a physical device

The Arduino companion scripts can be inspected and syntax-checked without a board, but actual compile/upload validation requires Arduino CLI, the `arduino:avr` core, an Arduino Uno, USB cable, and the correct serial port. The upload helper requires explicit confirmation.

## Release status convention

A build passing in this environment is not the same as an interactive install test on the user's machine. Record package build results separately from Windows/Kali installation tests and physical Uno upload tests.

© Albatany 2026.
