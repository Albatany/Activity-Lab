# GitHub Release Guide

## 1. Check the source

```bash
git status --short
npm ci
npm test
npm run check
```

Build the IntelliJ plugin with JDK 21:

```bash
cd intellij
./gradlew test buildPlugin
cd ..
```

## 2. Inspect generated packages

- VS Code: `release/activity-lab-standalone-6.1.0.vsix`
- IntelliJ IDEA: `intellij/build/distributions/activity-lab-6.1.0.zip`
- Arduino: `release/Activity-Lab-Arduino-Companion-6.1.0.zip`

Run the validation checklist in `VALIDATION.md`. Physical Arduino upload testing must be recorded separately from source/build checks.

## 3. Review and commit

```bash
git diff --check
git status --short
git add -A
git diff --cached
git commit -m "Release Activity Lab Standalone 6.1.0"
```

## 4. Push a branch

```bash
git switch -c standalone-6.1.0
git push -u origin standalone-6.1.0
```

Review the pushed branch before creating a GitHub Release. Do not overwrite an existing tag without checking its contents.

© Albatany 2026.
