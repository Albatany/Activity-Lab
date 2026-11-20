# Troubleshooting

| Symptom | What to check |
| --- | --- |
| Activity Lab commands are missing. | Verify that the VSIX is installed and enabled in this VS Code profile. Run **Developer: Reload Window**, then search the Command Palette for Activity Lab. |
| The terminal cannot find `code`. | Use **Extensions** and **Install from VSIX** in VS Code. |
| A preset is missing. | Open **Saved Language** in the profile where you saved it. **Use once** skips saving. |
| A session stopped adding text. | Run **Activity Lab: Show Status**. A manual edit, file limit, expired timer or closed extension host can end a session. |
| A scratch file keeps its plain text grammar. | Install a VS Code grammar for that language. Samples still use the selected profile. |
| A tracker shows different counts or a different project name. | Check the session marker and the tracker’s logs. See the guide below for how the local counters work. |
| Scratch files use too much disk space. | Stop the session, then delete the session folders you no longer need. |

[Project names and statistics](PROJECTS_AND_STATISTICS.md)
