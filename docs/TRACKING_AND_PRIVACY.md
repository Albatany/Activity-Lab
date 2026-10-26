# Tracking, Metrics, and Privacy

Activity Lab is a controlled local editor simulator. It generates placeholder edits through the VS Code workspace APIs inside an isolated scratch directory.

## What it can measure

The local report records the chosen project label, profile selection, generated file names, local line additions and deletions, the number of simulated steps, and elapsed wall-clock time.

## What it does not verify

Activity Lab **does not** verify WakaTime server heartbeats, actual coding time, additions or deletions displayed by WakaTime, or the behavior of any third-party tracking extension. Those services may ignore automated file changes or classify them differently. The WakaTime verified language catalog is a directory of language names, not a guarantee that a generated scratch file will be recognized under that language.

A `.wakatime-project` marker is written only in the isolated session folder. Compatible trackers may use it as a project name if they independently recognize the activity. Never present simulator output as human coding hours or professional experience.

## Privacy

The extension does not request WakaTime API keys, GitHub tokens, or passwords. It does not make direct heartbeat submissions. The only optional outgoing request retrieves the public WakaTime language catalog when the user chooses that menu item. Other session data and saved presets remain local to VS Code, except for any tracking extension separately installed by the user.

## Safety limits

Activity Lab only edits scratch files that it created. It stops if a file has been modified unexpectedly. Generated file sizes are capped at 2 MB each and 10 MB per session. The Unlimited / Until I Stop option ends if the extension host closes or a safety condition stops the session.

**© Albatany 2026**
