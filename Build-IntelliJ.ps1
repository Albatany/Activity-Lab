[CmdletBinding()]
param(
    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
$ProjectDir = Join-Path $PSScriptRoot 'intellij'
$Wrapper = Join-Path $ProjectDir 'gradlew.bat'
$ExpectedZip = Join-Path $ProjectDir 'build\distributions\activity-lab-6.1.2.zip'
$CmdExe = if ($env:ComSpec) { $env:ComSpec } else { 'cmd.exe' }

Write-Host ''
Write-Host 'Activity Lab Standalone 6.1.2 - IntelliJ IDEA Builder' -ForegroundColor Cyan
Write-Host 'Copyright (c) Albatany 2026' -ForegroundColor DarkGray
Write-Host ''

if (-not (Test-Path -LiteralPath $Wrapper)) {
    Write-Host 'ERROR: Gradle wrapper was not found.' -ForegroundColor Red
    Write-Host "Expected: $Wrapper"
    Write-Host 'Make sure this script is located beside the intellij folder.'
    exit 2
}

function Get-JavaInfo {
    param([Parameter(Mandatory = $true)][string]$JavaExe)

    if (-not (Test-Path -LiteralPath $JavaExe -PathType Leaf)) {
        return $null
    }

    # java -version writes to STDERR. Run it through cmd.exe and merge STDERR
    # into STDOUT so Windows PowerShell does not turn the expected output into
    # a terminating NativeCommandError when ErrorActionPreference is Stop.
    $CommandLine = '"{0}" -version 2>&1' -f $JavaExe
    $OutputLines = @(& $script:CmdExe /d /c $CommandLine)
    $CommandExitCode = $LASTEXITCODE
    $Output = ($OutputLines | Out-String).Trim()

    if ([string]::IsNullOrWhiteSpace($Output)) {
        return $null
    }

    $VersionMatch = [regex]::Match($Output, '(?i)version\s+"(?<version>[^"]+)"')
    if (-not $VersionMatch.Success) {
        $VersionMatch = [regex]::Match($Output, '(?i)openjdk\s+(?<version>\d+(?:\.\d+){0,3})')
    }
    if (-not $VersionMatch.Success) {
        return [pscustomobject]@{
            Path = $JavaExe
            Version = 'Unknown'
            Major = 0
            Output = $Output
            ExitCode = $CommandExitCode
        }
    }

    $Version = $VersionMatch.Groups['version'].Value
    $MajorMatch = [regex]::Match($Version, '^1\.(?<major>\d+)|^(?<major>\d+)')
    $Major = 0
    if ($MajorMatch.Success) {
        $Major = [int]$MajorMatch.Groups['major'].Value
    }

    return [pscustomobject]@{
        Path = $JavaExe
        Version = $Version
        Major = $Major
        Output = $Output
        ExitCode = $CommandExitCode
    }
}

# Prefer the currently active JDK if it is already Java 21. If PATH points to
# Java 25 but JDK 21 is also installed, look for the JDK 21 installation and
# select it for this build process only.
$CandidateJavaPaths = New-Object System.Collections.Generic.List[string]
$ActiveJava = Get-Command java -ErrorAction SilentlyContinue
if ($ActiveJava -and $ActiveJava.Source) {
    $CandidateJavaPaths.Add($ActiveJava.Source)
}
if ($env:JAVA_HOME) {
    $CandidateJavaPaths.Add((Join-Path $env:JAVA_HOME 'bin\java.exe'))
}

$SearchRoots = @()
if ($env:ProgramFiles) {
    $SearchRoots += (Join-Path $env:ProgramFiles 'Eclipse Adoptium')
    $SearchRoots += (Join-Path $env:ProgramFiles 'Java')
    $SearchRoots += (Join-Path $env:ProgramFiles 'Microsoft')
    $SearchRoots += (Join-Path $env:ProgramFiles 'Amazon Corretto')
    $SearchRoots += (Join-Path $env:ProgramFiles 'BellSoft')
}
if ($env:LOCALAPPDATA) {
    $SearchRoots += (Join-Path $env:LOCALAPPDATA 'Programs\Eclipse Adoptium')
    $SearchRoots += (Join-Path $env:LOCALAPPDATA 'Programs\Microsoft')
}

foreach ($Root in $SearchRoots) {
    if (Test-Path -LiteralPath $Root -PathType Container) {
        $JdkFolders = Get-ChildItem -LiteralPath $Root -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '(^|[-_])jdk[-_]?21|jdk-21|jdk21|21.*hotspot' }
        foreach ($JdkFolder in $JdkFolders) {
            $CandidateJavaPaths.Add((Join-Path $JdkFolder.FullName 'bin\java.exe'))
        }
    }
}

$SeenJavaPaths = @{}
$SelectedJava = $null
$DetectedVersions = New-Object System.Collections.Generic.List[string]
foreach ($CandidatePath in $CandidateJavaPaths) {
    if ([string]::IsNullOrWhiteSpace($CandidatePath)) { continue }
    $NormalizedPath = [System.IO.Path]::GetFullPath($CandidatePath)
    if ($SeenJavaPaths.ContainsKey($NormalizedPath)) { continue }
    $SeenJavaPaths[$NormalizedPath] = $true

    $JavaInfo = Get-JavaInfo -JavaExe $NormalizedPath
    if ($null -eq $JavaInfo) { continue }
    $DetectedVersions.Add(('{0} ({1})' -f $JavaInfo.Version, $JavaInfo.Path))
    if ($JavaInfo.Major -eq 21) {
        $SelectedJava = $JavaInfo
        break
    }
}

if ($null -eq $SelectedJava) {
    Write-Host 'ERROR: A full JDK 21 installation is required for this IntelliJ plugin build.' -ForegroundColor Red
    if ($DetectedVersions.Count -gt 0) {
        Write-Host 'Detected Java installation(s):' -ForegroundColor Yellow
        foreach ($Detected in $DetectedVersions) { Write-Host "  - $Detected" }
    } else {
        Write-Host 'No usable Java installation was detected.' -ForegroundColor Yellow
    }
    Write-Host ''
    Write-Host 'Install Eclipse Temurin JDK 21 with this command:' -ForegroundColor Cyan
    Write-Host '  winget install EclipseAdoptium.Temurin.21.JDK' -ForegroundColor White
    Write-Host 'Or download JDK 21 from https://adoptium.net/temurin/releases/?version=21'
    Write-Host ''
    Write-Host 'After installation, close this window and run Build-IntelliJ.cmd again.'
    Write-Host 'The builder will automatically look for the JDK 21 installation.'
    Write-Host ''
    Write-Host 'Why Java 21? This project compiles against Java 21 and its bundled Gradle 9.0.0 wrapper is not certified to run on Java 25.' -ForegroundColor Yellow
    exit 5
}

$JdkHome = Split-Path -Parent (Split-Path -Parent $SelectedJava.Path)
$JavacExe = Join-Path $JdkHome 'bin\javac.exe'
if (-not (Test-Path -LiteralPath $JavacExe -PathType Leaf)) {
    Write-Host 'ERROR: The selected Java 21 installation does not contain javac.exe.' -ForegroundColor Red
    Write-Host "Selected JDK: $JdkHome"
    Write-Host 'Install a JDK package, not a JRE package.'
    exit 6
}

# Use JDK 21 for this process, without permanently modifying Windows settings.
$env:JAVA_HOME = $JdkHome
$env:Path = (Join-Path $JdkHome 'bin') + ';' + $env:Path

Write-Host 'Selected JDK:' -ForegroundColor Gray
Write-Host "  $JdkHome" -ForegroundColor Cyan
Write-Host "  Java $($SelectedJava.Version)" -ForegroundColor Gray
Write-Host ''

Push-Location $ProjectDir
try {
    $Tasks = @('buildPlugin', '--no-daemon')
    if (-not $SkipTests) {
        $Tasks = @('test', 'buildPlugin', '--no-daemon')
    }

    Write-Host 'Running Gradle. The first run needs internet access to download Gradle and IntelliJ build dependencies.' -ForegroundColor Yellow
    Write-Host 'Do not close this window while Gradle is running.' -ForegroundColor Gray
    Write-Host ''

    # Merge Gradle STDERR into STDOUT through cmd.exe. This prevents native
    # stderr records from aborting Windows PowerShell before Gradle can finish.
    $GradleCommandLine = '.\gradlew.bat ' + ($Tasks -join ' ') + ' 2>&1'
    & $script:CmdExe /d /c $GradleCommandLine
    $GradleExit = $LASTEXITCODE

    if ($GradleExit -ne 0) {
        Write-Host ''
        Write-Host "Gradle failed with exit code $GradleExit." -ForegroundColor Red
        Write-Host 'Common causes:' -ForegroundColor Yellow
        Write-Host '  1. Gradle distribution/dependencies could not be downloaded (internet, DNS, proxy, firewall).'
        Write-Host '  2. A dependency repository is blocked by the network.'
        Write-Host '  3. The build reports a source-code or test failure.'
        Write-Host ''
        Write-Host 'Please copy the FIRST Gradle error block above the BUILD FAILED line.'
        exit $GradleExit
    }

    if (-not (Test-Path -LiteralPath $ExpectedZip)) {
        Write-Host 'ERROR: Gradle completed, but the expected plugin ZIP was not found:' -ForegroundColor Red
        Write-Host $ExpectedZip
        exit 4
    }

    Write-Host ''
    Write-Host 'BUILD SUCCESSFUL' -ForegroundColor Green
    Write-Host 'Install this file in IntelliJ IDEA:' -ForegroundColor Green
    Write-Host $ExpectedZip -ForegroundColor Cyan
    Write-Host ''
    Write-Host 'IntelliJ IDEA: Settings > Plugins > gear icon > Install Plugin from Disk...' -ForegroundColor Gray
    exit 0
}
finally {
    Pop-Location
}
