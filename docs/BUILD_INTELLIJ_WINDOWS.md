# Build IntelliJ IDEA plugin on Windows

This helper avoids PowerShell working-directory mistakes. It is placed beside the `intellij` folder and invokes the included `gradlew.bat` itself.

## Requirements

- Windows 10/11, 64-bit
- JDK 21 installed and available on `PATH` (`java -version` should show 21)
- Internet access on the first build so Gradle and the IntelliJ Platform Gradle Plugin can download the required build dependencies

## Build (recommended)

1. Extract `Activity-Lab-Standalone-6.1.0-Source-Kit.zip` completely. Do not run the build from inside the ZIP preview.
2. Open the extracted folder `Activity-Lab-Standalone-6.1.0\Activity-Lab`.
3. Click the address bar in File Explorer, type `powershell`, and press Enter. PowerShell opens in the correct folder.
4. Run:

```powershell
.\Build-IntelliJ.ps1
```

If Windows blocks the script for this PowerShell window, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\Build-IntelliJ.ps1
```

Or run it in one command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Build-IntelliJ.ps1
```

## Alternative: run Gradle directly

From `Activity-Lab-Standalone-6.1.0\Activity-Lab`:

```powershell
cd .\intellij
.\gradlew.bat test buildPlugin --no-daemon
```

**Important:** In PowerShell, use `.\gradlew.bat`, not `./gradlew` and not `gradlew` without the `.\` prefix. Also ensure the current directory is the `intellij` folder that contains `gradlew.bat`.

## Output

After a successful build, the installable plugin is:

```text
intellij\build\distributions\activity-lab-6.1.0.zip
```

Install it in IntelliJ IDEA via **Settings > Plugins > gear icon > Install Plugin from Disk...** and select the ZIP.

## If it still fails

- `java is not recognized`: install JDK 21 and reopen PowerShell.
- `JAVA_HOME is set to an invalid directory`: point `JAVA_HOME` to the JDK 21 folder, not its `bin` subfolder.
- `UnknownHostException`, `Could not resolve host`, `Connect timed out`, or Gradle distribution download failed: this is a network/DNS/proxy/firewall issue, not a PowerShell syntax issue. Gradle must be able to reach `services.gradle.org` and the Maven/JetBrains artifact repositories for the first build.
- `.\gradlew.bat is not recognized` or path not found: PowerShell is in the wrong directory, or the ZIP was not fully extracted.

The build has not been run on your Windows computer. The resulting ZIP is considered installable only after Gradle finishes with `BUILD SUCCESSFUL` and creates the output path above.

© Albatany 2026 — Push the limits.

## Easiest Windows method

After extracting the source kit, open `Activity-Lab-Standalone-6.1.0\\Activity-Lab`.
Double-click `Build-IntelliJ.cmd`. This launcher changes to its own project directory and invokes
`Build-IntelliJ.ps1` with a temporary execution-policy bypass. Keep `Build-IntelliJ.cmd`,
`Build-IntelliJ.ps1`, and the `intellij` folder together in the `Activity-Lab` directory.


### Java version note (builder update)

The IntelliJ plugin is compiled with a Java 21 toolchain. The Windows builder now safely captures `java -version`, automatically searches common Windows installation folders for JDK 21, and selects it for the build process. It does not change the machine-wide `JAVA_HOME` or PATH.

If only Java 25 is installed, install a full JDK 21 first:

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
```

Then close the current terminal and run `Build-IntelliJ.cmd` again. The builder needs a full JDK (including `javac.exe`), not a JRE.
