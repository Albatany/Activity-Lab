#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-help}"
if (($# > 0)); then shift; fi
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_SKETCH="$(cd -- "$SCRIPT_DIR/.." && pwd)/ActivityLabUno"
SKETCH_PATH="$DEFAULT_SKETCH"
PORT=""
FQBN="arduino:avr:uno"
ASSUME_YES=0

usage() {
  cat <<'USAGE'
Activity Lab Arduino Uno Companion

Usage:
  ./activity-lab-arduino.sh list
  ./activity-lab-arduino.sh compile [--sketch PATH] [--fqbn BOARD]
  ./activity-lab-arduino.sh upload --port PORT [--sketch PATH] [--fqbn BOARD] [--yes]
  ./activity-lab-arduino.sh compile-upload --port PORT [--sketch PATH] [--fqbn BOARD] [--yes]

Options:
  --sketch PATH  Sketch directory (default: ../ActivityLabUno)
  --port PORT    Explicit serial port, e.g. /dev/ttyACM0
  --fqbn BOARD   Board FQBN (default: arduino:avr:uno)
  --yes          Skip interactive upload confirmation.

Upload always compiles first and requires an explicit serial port.
USAGE
}

while (($#)); do
  case "$1" in
    --sketch) (($# >= 2)) || { echo 'Missing value for --sketch' >&2; exit 2; }; SKETCH_PATH="$2"; shift 2 ;;
    --port) (($# >= 2)) || { echo 'Missing value for --port' >&2; exit 2; }; PORT="$2"; shift 2 ;;
    --fqbn) (($# >= 2)) || { echo 'Missing value for --fqbn' >&2; exit 2; }; FQBN="$2"; shift 2 ;;
    --yes) ASSUME_YES=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ "$ACTION" == 'help' || "$ACTION" == '-h' || "$ACTION" == '--help' ]]; then usage; exit 0; fi
CLI="${ARDUINO_CLI:-$(command -v arduino-cli || true)}"
if [[ -z "$CLI" || ! -x "$CLI" ]]; then
  echo 'arduino-cli was not found. Install it, add it to PATH, or set ARDUINO_CLI.' >&2
  exit 127
fi
if [[ "$ACTION" == 'list' ]]; then exec "$CLI" board list; fi
if [[ ! -d "$SKETCH_PATH" ]]; then echo "Sketch directory not found: $SKETCH_PATH" >&2; exit 2; fi
SKETCH_PATH="$(cd -- "$SKETCH_PATH" && pwd)"
SKETCH_NAME="$(basename -- "$SKETCH_PATH")"
INO_PATH="$SKETCH_PATH/$SKETCH_NAME.ino"
if [[ ! -f "$INO_PATH" ]]; then
  echo "Expected sketch file '$INO_PATH'. The folder and .ino filename must match." >&2
  exit 2
fi

"$CLI" compile --fqbn "$FQBN" "$SKETCH_PATH"
if [[ "$ACTION" == 'compile' ]]; then exit 0; fi
if [[ "$ACTION" != 'upload' && "$ACTION" != 'compile-upload' ]]; then usage >&2; exit 2; fi
if [[ -z "$PORT" ]]; then echo 'Upload requires an explicit --port value, e.g. --port /dev/ttyACM0.' >&2; exit 2; fi

if ((ASSUME_YES == 0)); then
  printf "About to upload '%s' to Arduino Uno on port '%s'.\n" "$INO_PATH" "$PORT"
  read -r -p 'Type UPLOAD to continue: ' answer
  if [[ "$answer" != 'UPLOAD' ]]; then echo 'Upload cancelled.'; exit 2; fi
fi

"$CLI" upload --fqbn "$FQBN" --port "$PORT" "$SKETCH_PATH"
echo 'Activity Lab sketch uploaded successfully.'
