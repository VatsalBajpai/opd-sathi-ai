@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo   OPD Saathi AI - Final Verification
echo ==========================================

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not on PATH.
  echo Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)

if not exist package.json (
  echo ERROR: package.json is not in this folder.
  echo Open the project root folder and run CHECK_WINDOWS.cmd there.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm.cmd install
  if errorlevel 1 goto :fail
)

echo.
echo [1/3] Running TypeScript and ESLint checks...
call npm.cmd run check
if errorlevel 1 goto :fail

echo.
echo [2/3] Running production build...
call npm.cmd run build
if errorlevel 1 goto :fail

echo.
echo [3/3] Running production runtime smoke tests...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0FINAL_VERIFY_WINDOWS.ps1"
if errorlevel 1 goto :fail

echo.
echo ==========================================
echo   ALL CHECKS PASSED
 echo ==========================================
pause
exit /b 0

:fail
echo.
echo ==========================================
echo   CHECK FAILED - see the error above
 echo ==========================================
pause
exit /b 1
