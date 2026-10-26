# Troubleshooting

## Activity Lab commands do not appear

Open the Extensions panel and verify that Activity Lab is enabled. Reload VS Code and try `Ctrl + Shift + P` again. If you upgraded from an older release, reinstall the v5 VSIX with `--force` and reload.

## Multi-select seems empty

Type a common language, such as Python or SQL. The catalog is bundled with the extension and works offline. You must select at least one profile. To avoid excess editor overhead, each session is limited to 48 selected profiles.

## A saved preset is missing

Presets are stored locally in the current VS Code installation, not in the repository or generated session directory. Presets do not automatically transfer between VS Code profiles, Windows, or Linux.

## A language appears as Plain Text

Your VS Code installation may not include the requested syntax mode. File extensions help language detection but do not guarantee it. Install a relevant syntax extension if you need syntax highlighting for that file type.

## The optional online catalog cannot load

The WakaTime API may be unavailable or your network may block it. Use the 141 built in profiles instead; those require no internet connection.

## The session ends unexpectedly

Open the error notification. Activity Lab intentionally stops when a scratch file changes unexpectedly, the VS Code extension host closes, or the session reaches its configured duration or safety limits. Check the generated folder under your home directory.

## WakaTime does not show the expected time or language

This is not a verified tracking integration. WakaTime decides whether and how to accept editor events, and Activity Lab does not directly submit heartbeats. Synthetic line counts are not equivalent to server statistics. Use the official WakaTime extension documentation for supported metrics.

## Uninstall

Uninstall Activity Lab from the VS Code Extensions view. Old session directories under `~/.vscode-activity-lab/` are not deleted automatically; remove them manually if no longer needed.

**© Albatany 2026**
