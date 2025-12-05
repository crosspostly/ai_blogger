@echo off
chcp 65001 >nul
REM Multi-Platform Video Uploader - Launcher

setlocal enabledelayedexpansion
cd /d "%~dp0"
color 0A

echo.
echo ============================================================
echo  MULTI-PLATFORM VIDEO UPLOADER ORCHESTRATOR
echo  Instagram + YouTube + TikTok
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python.
    pause
    exit /b 1
)

echo [OK] Python found

REM Check if required files exist
if not exist "orchestrator.py" (
    echo [ERROR] orchestrator.py not found!
    pause
    exit /b 1
)

if not exist "uploader_ig.py" (
    echo [ERROR] uploader_ig.py not found!
    pause
    exit /b 1
)

if not exist "uploader_yt.py" (
    echo [ERROR] uploader_yt.py not found!
    pause
    exit /b 1
)

if not exist "uploader_tt.py" (
    echo [ERROR] uploader_tt.py not found!
    pause
    exit /b 1
)

echo [OK] All scripts found
echo.

REM Create videos_queue folder if not exists
if not exist "videos_queue" (
    mkdir videos_queue
    echo [OK] Created videos_queue folder
)

REM Menu
echo.
echo ============================================================
echo Choose upload mode:
echo.
echo 1) Sequential (safer, one platform at a time)
echo 2) Parallel (faster, uploads to all at once)
echo 3) Exit
echo ============================================================
echo.

set /p choice=Enter your choice (1-3): 

if "%choice%"=="1" (
    echo.
    echo Starting SEQUENTIAL upload...
    echo.
    python orchestrator.py sequential
    goto :end
)

if "%choice%"=="2" (
    echo.
    echo Starting PARALLEL upload...
    echo.
    python orchestrator.py parallel
    goto :end
)

if "%choice%"=="3" (
    exit /b 0
)

echo [ERROR] Invalid choice
pause
exit /b 1

:end
echo.
echo Press any key to exit...
pause >nul
exit /b 0