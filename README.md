<div align="center">

# Activity Lab

### A configurable editor simulation playground for Visual Studio Code

**Create isolated experiments. Explore file profiles. Customize your own language mix.**

![Version](https://img.shields.io/badge/version-5.0.0-24292f?style=flat-square)
![VS Code](https://img.shields.io/badge/VS_Code-1.85%2B-007acc?style=flat-square)
![Platforms](https://img.shields.io/badge/platform-Windows_%7C_Linux-444?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-555?style=flat-square)

**© Albatany 2026**

</div>

## What is Activity Lab?

Activity Lab is an open source VS Code extension for **synthetic editor experiments**. It generates disposable scratch files using the official VS Code editing APIs, letting you explore how languages, editor events, file changes, and local reports behave across different configurations.

Version 5 introduces **Custom Language Selection**. You can choose your own combination from 141 built in language and file profiles instead of being limited to a ready made technology track. The entire extension and its documentation are written in English.

> [!IMPORTANT]
> Activity Lab is a simulator, **not a source of verified coding hours or professional experience**. Generated edits are automatically produced, not human coding. WakaTime and other extensions independently decide whether to record or ignore events. Activity Lab cannot guarantee any heartbeat, duration, language, project name, additions, or deletions in an external dashboard. It does not send heartbeats or collect API keys.

## Highlights

| Feature | What it does |
| :--- | :--- |
| **Choose multiple languages** | Search and select your own mix of up to 48 profiles per session from 141 built in choices |
| **Save language presets** | Save, reuse, or delete up to 20 custom language combinations |
| **32 professional tracks** | Ready made themes including Full Stack, AI Engineer, Data Analyst, Cyber Security, MLOps, and Embedded Systems |
| **Custom project names** | Write an optional `.wakatime-project` marker to a session sandbox folder |
| **Randomized file names** | Creates scratch files with contextual names such as `data_pipeline_a1b2c3.py` |
| **Line change patterns** | Balanced 1:1, additions favored 4:1, and high growth 8:1 synthetic changes |
| **Flexible sessions** | Choose 5 minutes to 8 hours, enter 1–480 minutes, or run Until I Stop |
| **Local session reports** | Examine generated changes, selected languages, elapsed wall time, and file names |
| **Windows and Kali Linux** | Same VSIX installation for either system |

## Install

### Install from VS Code

1. Download `activity-lab-synthetic-5.0.0.vsix` from the GitHub Releases page of this repository, or use the copy in `release/`.
2. In VS Code, open **Extensions** (`Ctrl + Shift + X`).
3. Open the Extensions actions menu and select **Install from VSIX...**.
4. Select the `.vsix` file and reload VS Code if asked.
5. Open the Command Palette (`Ctrl + Shift + P`), then run **Activity Lab: Start Simulation**.

### Install from a terminal

Windows PowerShell:

```powershell
code --install-extension .\activity-lab-synthetic-5.0.0.vsix --force
```

Kali Linux or another supported Linux distribution:

```bash
code --install-extension ./activity-lab-synthetic-5.0.0.vsix --force
```

The extension identifier remains **`localdev.activity-lab-synthetic`** for upgrades from v1 through v4. You do not need Python or Node.js to install the packaged VSIX. Node.js is only needed to run source tests or rebuild the extension.

## Choose your own languages

1. Run **Activity Lab: Start Simulation**.
2. Choose **Choose multiple languages**.
3. Search for languages, and select every file profile you want to experiment with.
4. Confirm your selection. You can optionally save it as a reusable preset.
5. Enter a project name or leave the field blank for the default sandbox name.
6. Choose the session duration, line change pattern, and edit interval.
7. Read the synthetic activity notice and select **Start simulation**.

Example custom mix:

```text
Choose multiple languages
  Python
  TypeScript
  SQL
  Bash
  Rust
  Markdown

Save as a reusable preset → My Development Mix
Project name → Example Research 2026
Duration → 30 minutes
Change pattern → Additions favored 4:1
Edit interval → 30 seconds
```

Each selected profile receives its **own scratch file**. The extension rotates through those files during a session. The multi-select menu supports a maximum of 48 languages per session to limit editor overhead. The remaining built in profiles can be selected in another session.

### Presets

Presets are stored in VS Code extension storage on the current installation. Choose **Saved language presets** from the start menu to reuse them. To delete one, open the Command Palette and run **Activity Lab: Manage Language Presets**. Presets store only language labels; they do not store generated source files or account credentials.

### Other language options

You can still select a **Single language**, use one of the **Professional modes**, or choose a **Custom file type** to specify a file extension and installed VS Code syntax mode. An optional **WakaTime language catalog** lets you browse verified language names online. A catalog name is not necessarily a VS Code syntax mode, and an extension alone does not guarantee tracker classification.

## Commands

| Command | Description |
| :--- | :--- |
| `Activity Lab: Start Simulation` | Configure and start a sandbox session |
| `Activity Lab: Stop Simulation` | Stop, then generate the session report |
| `Activity Lab: Session Status` | Display current local simulation counters |
| `Activity Lab: Manage Language Presets` | Delete unused saved language presets |

You can also select the Activity Lab status bar entry to stop a running session.

## Session output

Files are created inside `~/.vscode-activity-lab/` in a new, isolated directory for every session.

```text
~/.vscode-activity-lab/
  session-2026-10-24T...-a1b2c3/
    .wakatime-project
    ABOUT_SIMULATION.txt
    data_pipeline_12ab34.py
    query_report_56cd78.sql
    deploy_script_91ef02.sh
    architecture_notes_ab1234.md
    session-report.json
```

Only the files created in the new scratch session are edited. If a scratch file changes unexpectedly, Activity Lab stops rather than overwriting manual edits. A session has a 2 MB per file and 10 MB total data limit. The interval timer runs while the VS Code extension host stays active.

The report's `synthetic_additions` and `synthetic_deletions` fields count **local generated lines**. They are not WakaTime server metrics. The project marker only suggests a project name to compatible trackers; it is not a guarantee that any activity will appear on your profile.

Read [Tracking and privacy](docs/TRACKING_AND_PRIVACY.md) for important limitations.

## Documentation

[Getting started](docs/GETTING_STARTED.md) · [Tracking and privacy](docs/TRACKING_AND_PRIVACY.md) · [Troubleshooting](docs/TROUBLESHOOTING.md) · [GitHub release guide](docs/GITHUB_RELEASE_GUIDE.md) · [Changelog](CHANGELOG.md)

## Development and testing

Clone the repository, install Node.js, then run:

```bash
npm test
npm run check
```

To rebuild a VSIX using the official VS Code packaging tool, install `@vscode/vsce` and run its package command. Details are provided in the [GitHub release guide](docs/GITHUB_RELEASE_GUIDE.md).

## Contributing

Issues and pull requests are welcome, especially those improving cross-platform compatibility, language coverage, accessibility, and tests. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) before contributing.

Activity Lab is not affiliated with Microsoft or WakaTime.

**Built by Albatany · © Albatany 2026 · MIT License**
