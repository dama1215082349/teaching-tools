@echo off
title Lottery Server
cd /d "%~dp0"

echo.
echo ========================================
echo   Starting Lottery Server...
echo ========================================
echo.

echo [Step 1] Trying PowerShell server...
echo.

powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0server-win7.ps1"

if %ERRORLEVEL% EQU 0 goto :done

echo.
echo [Step 1 FAILED] PowerShell error (code: %ERRORLEVEL%)
echo Trying Python...
echo.

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Found Python, starting...
    python "%~dp0server.py"
    goto :done
)

where python3 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Found Python3, starting...
    python3 "%~dp0server.py"
    goto :done
)

echo.
echo ========================================
echo   All methods failed!
echo   Opening HTML directly (save disabled)
echo ========================================
echo.
echo   To fix, install Python 3.8:
echo   https://www.python.org/downloads/release/python-3820/
echo.

start "" "%~dp0index.html"

:done
echo.
echo ========================================
echo   Server stopped.
echo ========================================
echo.
echo Press any key to close...
pause >nul
