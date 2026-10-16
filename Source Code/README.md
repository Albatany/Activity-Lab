# Activity Lab v3.0.0 — Synthetic Editor Line-Change Simulator

VS Code extension for **Windows and Kali Linux**. Produces line-level additions and deletions in an isolated editor scratch project. Includes the v2 library of 141 file/language profiles, full-stack rotation, sessions up to 8 hours, and an indefinite mode.

> **Important:** These operations are fully **synthetic**, not real programming work. The counters reflect only the extension's own generated placeholder-line operations. They are **not WakaTime heartbeat records, dashboard additions/deletions, professional experience, or billable time**. WakaTime decides independently whether to record and count any activity.

## What's new in v3.0

An additional selection in `Activity Lab: Start Synthetic Session` controls **local** additions and deletions:

| Mode | Per step | Explanation |
|---|---|---|
| Balanced (approximately 1:1) | +4 and up to -4 lines | Delete up to four previously generated scratch lines; first step necessarily adds some seed lines. |
| Additions favored (4:1) | +4 and up to -1 line | Adds grow more quickly than deletions. |
| Additions strongly favored (8:1) | +8 and up to -1 line | Stronger additions bias. |

- Actual edits use VS Code's `workspace.applyEdit` and `TextDocument.save()` APIs; no simulated keyboard system-wide, no fabricated heartbeat API calls, no direct edits to WakaTime config or storage.
- All files are written under the labeled `ActivityLab-Synthetic` test project. Only lines created by Activity Lab are eligible for deletion. If you edit a scratch file manually mid-session, the session stops instead of overwriting it.
- The status bar shows **LOCAL SYNTHETIC** `+additions/-deletions` counters; `Activity Lab: Show Session Status` shows the same values. The `session-report.json` file in the scratch folder records totals after manual or automatic stop and explicitly sets `wakatime_verified: false`.
- JSON uses whole-document replacement to preserve valid JSON, so external trackers may interpret its line changes differently from the simulator's logical row counts. Other languages use explicit inserted and deleted text ranges.
- There are 2 MB/file and 10 MB/session safety quotas. Indefinite mode can stop early when a quota is hit; stop it yourself when done. The session only runs while the VS Code extension host is alive.

## Install or update — no separate Windows/Kali versions

### VS Code GUI

1. Extract the ZIP package, or use the `.vsix` installer directly.
2. VS Code → Extensions (`Ctrl+Shift+X`) → `...` → **Install from VSIX…** → select `activity-lab-synthetic-3.0.0.vsix`.
3. Reload VS Code if prompted. This installer updates v1/v2 because it keeps the extension ID `localdev.activity-lab-synthetic`.
4. `Ctrl+Shift+P` → **Activity Lab: Start Synthetic Session**.
5. Choose a language or full-stack stack; duration (up to 8 hours or `Until I stop`); desired line-change ratio; edit interval (15, 30, 60, or 120 seconds); then confirm the synthetic-test warning.
6. Watch the status bar, or open `Activity Lab: Show Session Status`.
7. Run **Activity Lab: Stop Session** (or click the status bar) to stop and save the report.

### Windows PowerShell

```powershell
code --install-extension .\activity-lab-synthetic-3.0.0.vsix --force
```

### Kali Linux terminal

```bash
code --install-extension ./activity-lab-synthetic-3.0.0.vsix --force
```

Install VS Code and ensure `code` is on PATH, or use the GUI. If VS Code is connected to a WSL or SSH remote environment, install on the active extension host too, according to your VS Code setup.

## WakaTime: what you can verify

WakaTime's official VS Code plugin can receive change/save-related events from VS Code. However, **the fact that Activity Lab edited/saved a file does not prove WakaTime created a heartbeat or counted lines**. Its server can process, aggregate, exclude, or categorize those events differently. A +400/-100 local report does not imply those counts, or any time, appear in your dashboard.

1. Install and authenticate the official `WakaTime` extension (`WakaTime` → `API Key` if requested).
2. For a small experiment, choose a 15–30 minute Activity Lab session, *e.g.* `Balanced`, and note your WakaTime stats before the test.
3. Open `https://wakatime.com/dashboard` and inspect the clearly marked `ActivityLab-Synthetic` project afterward. Check the WakaTime extension logs if no activity appears. VS Code `Ctrl+Shift+P` → `WakaTime: Debug` → `true` enables diagnostics; WakaTime CLI also has a local log under `~/.wakatime/wakatime.log` (Windows: under your user home directory).
4. Distinguish WakaTime dashboard totals from local placeholder-line counts. It may display zero, different counts, delayed totals, or a different AI/human classification.
5. For precise heartbeat inspection, WakaTime documents the authenticated **read-only** endpoint `GET /api/v1/users/current/heartbeats?date=YYYY-MM-DD`, requiring `read_heartbeats` scope. This extension does **not** ask for or store a WakaTime API key and makes **no** heartbeat API calls.

Documentation:
- https://wakatime.com/faq
- https://wakatime.com/developers/ (Heartbeats & Stats endpoints)
- https://github.com/wakatime/vscode-wakatime (debugging and logs)

## Files and privacy

Scratch directory:
- Windows: `%USERPROFILE%\.vscode-activity-lab\session-...\`
- Kali Linux: `~/.vscode-activity-lab/session-.../`

The project has a `.wakatime-project` marker with the explicit name `ActivityLab-Synthetic`. The extension doesn't touch your actual repositories, repositories' `.git` directories, global key presses, or other users' accounts. No personal API keys are requested. The only network request it can make is an **optional public WakaTime programming-language catalog download**, already available in v2.

To clean up, first stop any running session, then delete the scratch directory if no longer needed. Deleting local files does not erase activity WakaTime might have stored remotely.

## Tests and limitations

Optional Node.js 18+ (only for running source tests):

```bash
npm test
npm run check
```

Tests use a mocked VS Code API to verify edit events, line ratio logic, XML/JSON package assets, session statuses and report generation. They are **not an end-to-end test** of a live VS Code process or your actual WakaTime account. The installer is packed as a standard VSIX archive and validated structurally, but is **not signed/published** to the extension marketplace.
