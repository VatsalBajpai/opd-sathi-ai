@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo   OPD Saathi AI - Local Development

echo ==========================================

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not on PATH.
  echo Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting OPD Saathi AI at http://localhost:3000
call npm.cmd run dev
pause
