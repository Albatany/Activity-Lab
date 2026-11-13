# IntelliJ IDEA 6.1.2 Validation

This release keeps local sandbox simulation, offline language selection, presets, foreground/background scheduling, and local JSON reports.

Build and test with JDK 21:

```bash
cd intellij
./gradlew test buildPlugin
```

The automated tests validate language catalogs, sandbox file safety, session timing, pause/resume, and background scheduler behaviour. The standalone source also removes a stale reference to the former document/save-event tracker diagnostics. The IntelliJ Gradle build must still be run on a machine that can resolve the Gradle distribution and IntelliJ dependencies. Interactive installation in a desktop IntelliJ instance remains a separate manual check.
