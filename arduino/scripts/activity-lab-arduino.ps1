[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('help', 'list', 'compile', 'upload', 'compile-upload')]
    [string]$Action = 'help',
    [string]$SketchPath = '',
    [string]$Port = '',
    [string]$Fqbn = 'arduino:avr:uno',
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'

function Show-Usage {
    Write-Host @'
Activity Lab Arduino Uno Companion

Usage:
  .\activity-lab-arduino.ps1 list
  .\activity-lab-arduino.ps1 compile [-SketchPath PATH]
  .\activity-lab-arduino.ps1 upload -Port COM5 [-SketchPath PATH] [-Yes]
  .\activity-lab-arduino.ps1 compile-upload -Port COM5 [-SketchPath PATH] [-Yes]

Options:
  -SketchPath  Sketch directory (default: ../ActivityLabUno)
  -Port        Explicit serial port, e.g. COM5
  -Fqbn        Board FQBN (default: arduino:avr:uno)
  -Yes         Skip the interactive confirmation; use only when intentional.

Upload always compiles first and requires an explicit serial port.
'@
}

if ($Action -eq 'help') { Show-Usage; exit 0 }

$cli = $env:ARDUINO_CLI
if ([string]::IsNullOrWhiteSpace($cli)) {
    $command = Get-Command 'arduino-cli' -ErrorAction SilentlyContinue
    if ($null -ne $command) { $cli = $command.Source }
}
if ([string]::IsNullOrWhiteSpace($cli) -or !(Test-Path -LiteralPath $cli -PathType Leaf)) {
    throw 'arduino-cli was not found. Install Arduino CLI, add it to PATH, or set ARDUINO_CLI to its executable path.'
}

if ($Action -eq 'list') {
    & $cli board list
    if ($LASTEXITCODE -ne 0) { throw "arduino-cli board list failed with exit code $LASTEXITCODE." }
    exit 0
}

if ([string]::IsNullOrWhiteSpace($SketchPath)) {
    $SketchPath = Join-Path $PSScriptRoot '..\ActivityLabUno'
}
$SketchPath = (Resolve-Path -LiteralPath $SketchPath).Path
$sketchName = Split-Path -Leaf $SketchPath
$inoPath = Join-Path $SketchPath ($sketchName + '.ino')
if (!(Test-Path -LiteralPath $inoPath -PathType Leaf)) {
    throw "Expected sketch file '$inoPath'. The sketch folder and .ino filename must match."
}

& $cli compile --fqbn $Fqbn $SketchPath
if ($LASTEXITCODE -ne 0) { throw "Compile failed with exit code $LASTEXITCODE. Upload was not attempted." }
if ($Action -eq 'compile') { exit 0 }
if ([string]::IsNullOrWhiteSpace($Port)) { throw 'Upload requires an explicit -Port value, such as -Port COM5.' }

if (!$Yes) {
    Write-Host "About to upload '$inoPath' to Arduino Uno on port '$Port'."
    $answer = Read-Host 'Type UPLOAD to continue'
    if ($answer -cne 'UPLOAD') { Write-Host 'Upload cancelled.'; exit 2 }
}

& $cli upload --fqbn $Fqbn --port $Port $SketchPath
if ($LASTEXITCODE -ne 0) { throw "Upload failed with exit code $LASTEXITCODE." }
Write-Host 'Activity Lab sketch uploaded successfully.'
