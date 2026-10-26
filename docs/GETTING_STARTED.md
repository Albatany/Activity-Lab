# Getting Started

Welcome to Activity Lab v5.0.0. This is a beginner-friendly guide to experimenting with synthetic editor changes in VS Code.

## 1. Install the extension

Open VS Code, choose **Extensions**, open the actions menu, select **Install from VSIX...**, and choose the v5 installer. Restart VS Code if prompted.

## 2. Start your first session

Press `Ctrl + Shift + P` and run **Activity Lab: Start Simulation**.

The first menu offers the following choices:

| Option | Best for |
| :--- | :--- |
| Choose multiple languages | Your own combination of programming or file profiles |
| Professional modes | A ready-made mix such as Full Stack, AI Engineer, or Data Analyst |
| Saved language presets | A previously saved custom combination |
| Single language | One language at a time |
| WakaTime language catalog | Exploring an optional online list of verified names |
| Custom file type | An extension and VS Code language mode that you specify |

For the new multi-select feature, use the search box and tick the languages you want. Press Enter when done. Save your selection as a preset if you expect to reuse it.

## 3. Configure the session

Enter a custom project name or leave it blank. Choose a duration of 5 minutes up to 8 hours, or **Until I stop**. Select a synthetic line change pattern and edit interval. Read the confirmation message before starting.

## 4. Check output

Activity Lab creates a separate directory inside `~/.vscode-activity-lab/`. Each generated file has a synthetic notice. After stopping, open `session-report.json` to inspect local counts. No actual development project is modified.

## 5. Stop and remove a session

Use **Activity Lab: Stop Simulation** or select the status bar indicator. You may manually delete an old session directory after the session finishes. Never delete your actual project folders.

## What is a saved preset?

It is simply a named list of selected language profiles. It does not contain code, credentials, or data from real projects. A preset is saved in the current VS Code installation and may not be available on other machines.

## Important clarification

A generated edit is not proof of recorded work. WakaTime and other analytics extensions decide independently whether they recognize an event. Activity Lab does not promise external stats or counted hours.

**© Albatany 2026**
