# IntelliJ IDEA Background Sessions

Activity Lab can either wait while IntelliJ IDEA is inactive or continue local sandbox edits in the background.

## Settings

In the new-session dialog or Activity Lab tool window, enable **Run in background (local simulation)** to continue local steps while IntelliJ is not the active window. Turn it off to wait until IntelliJ becomes active again.

## Timing behaviour

- The selected session duration is a wall-clock deadline.
- Waiting and manual Pause do not extend that deadline.
- Resume continues the same session, folder, and counters.
- Missed intervals are not replayed as a burst; the scheduler proceeds with its next normal step.
- The IDE must remain running. Sleep, shutdown, or process termination stops local scheduling.

The tool window separates running, waiting, and manually paused time. These values describe Activity Lab's own scheduler and do not represent verified coding hours.

© Albatany 2026.
