# Troubleshooting

## VS Code extension does not appear

Confirm that the `.vsix` file was installed through **Extensions → ... → Install from VSIX...** and reload the window. Check **Developer: Show Running Extensions** for activation errors.

## IntelliJ plugin fails to load

Confirm the plugin ZIP is the installable `activity-lab-intellij-6.1.0.zip`, not the outer source archive. Check **Help → Show Log in Explorer/Finder** for plugin loading errors and verify that your IDE build is compatible with the plugin's declared baseline.

## Session stops unexpectedly

Activity Lab stops when a generated scratch file is changed outside its expected content, the configured size limit is reached, an editor operation fails, or the session duration expires. Manually changed files are preserved.

## Arduino CLI is not found

Install Arduino CLI and add it to `PATH`, or set `ARDUINO_CLI` to the full executable path. Run `arduino-cli version` to verify.

## Arduino board not listed

Use `arduino-cli board list`, try another USB data cable or port, and confirm the OS has permission to access the serial device. Select the exact port manually when running the upload helper.

## Arduino compile/upload fails

Confirm `arduino:avr` is installed (`arduino-cli core list`), the board is an Uno, and the sketch folder contains `ActivityLabUno.ino`. Compile first and inspect the complete CLI output before attempting upload.

© Albatany 2026.


### IntelliJ builder stops while detecting Java 25

The bundled Gradle wrapper is 9.0.0 and the plugin uses a Java 21 toolchain. Install a full JDK 21 with `winget install EclipseAdoptium.Temurin.21.JDK`, then rerun `Build-IntelliJ.cmd`. The updated builder automatically selects a detected JDK 21 without changing your system-wide Java settings.
