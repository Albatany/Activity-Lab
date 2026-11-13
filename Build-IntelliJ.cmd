@echo off
setlocal
cd /d "%~dp0"
echo.
echo Activity Lab Standalone 6.1.2 - IntelliJ IDEA Builder
echo This launcher runs the PowerShell build script from the correct folder.
echo.
if not exist "%~dp0Build-IntelliJ.ps1" (
  echo ERROR: Build-IntelliJ.ps1 was not found beside this launcher.
  echo Please keep both files in the Activity-Lab project folder.
  echo.
  pause
  exit /b 2
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Build-IntelliJ.ps1"
set "BUILD_EXIT=%ERRORLEVEL%"
echo.
if "%BUILD_EXIT%"=="0" (
  echo Build completed successfully.
) else (
  echo Build failed with exit code %BUILD_EXIT%.
)
echo.
pause
exit /b %BUILD_EXIT%
