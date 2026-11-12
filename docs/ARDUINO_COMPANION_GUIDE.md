# Arduino IDE 2 + Arduino Uno Companion

## What this package is

The Arduino component is a companion bundle for Arduino IDE 2, not a native Arduino IDE extension. Arduino IDE 2 documents third-party theme installation, not a general-purpose extension workflow equivalent to VSIX or JetBrains plugins. Activity Lab therefore supplies an Uno sketch template and local Arduino CLI scripts.

## Included files

- `ActivityLabUno/ActivityLabUno.ino` — a safe Uno example using the built-in LED and serial status output.
- `scripts/activity-lab-arduino.ps1` — Windows helper.
- `scripts/activity-lab-arduino.sh` — Linux/macOS helper.

## Requirements

- Arduino IDE 2.
- Arduino Uno connected by USB when uploading.
- Arduino CLI installed and available on `PATH`, or set `ARDUINO_CLI` to its executable path.
- The `arduino:avr` core installed in the Arduino CLI configuration.

Arduino CLI provides the compile and upload commands. The Uno board identifier is `arduino:avr:uno`; upload uses an explicitly selected serial port.

## Windows

Extract the ZIP, then open PowerShell in the extracted `Activity-Lab-Arduino-Companion-6.1.0` folder:

```powershell
.\scripts\activity-lab-arduino.ps1 list
.\scripts\activity-lab-arduino.ps1 compile
.\scripts\activity-lab-arduino.ps1 upload -Port COM5
```

Change `COM5` to the port shown by `list`. The helper compiles first and asks you to type `UPLOAD` before flashing. The sketch can be opened separately in Arduino IDE 2 at `ActivityLabUno/ActivityLabUno.ino`.

## Linux / Kali Linux

```bash
chmod +x ./scripts/activity-lab-arduino.sh
./scripts/activity-lab-arduino.sh list
./scripts/activity-lab-arduino.sh compile
./scripts/activity-lab-arduino.sh upload --port /dev/ttyACM0
```

Change `/dev/ttyACM0` to the port shown by `list`. Add your user to the serial-device group if your Linux distribution requires it, then reconnect the board before retrying.

## Compile and upload behaviour

The helper compiles for `arduino:avr:uno`. Upload requires a manually supplied port and explicit confirmation; it is not automatic. The example sketch uses only the board's built-in LED and serial monitor output. It does not drive external pins.

If the core is missing, install it using Arduino CLI:

```bash
arduino-cli core update-index
arduino-cli core install arduino:avr
```

These core-management commands may access Arduino package servers. The Activity Lab helper itself does not use a tracking service or transmit session data.

© Albatany 2026 — Push the limits.
