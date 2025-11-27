@echo off
REM Enhanced Start Script with Docker Image Loading
REM Version: 0.1.0

echo ====================================
echo Interview Integrity System
echo Version: 0.1.0
echo ====================================
echo.

REM Check if Docker is running
echo Checking Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    echo.
    echo Please start Docker Desktop:
    echo   1. Open Docker Desktop from Start Menu
    echo   2. Wait for Docker to start (whale icon in system tray)
    echo   3. Run this script again
    echo.
    pause
    exit /b 1
)
echo [OK] Docker is running
echo.

REM Check if Docker images need to be loaded
if exist docker-images.tar (
    echo [CHECK] Checking if Docker images are loaded...
    docker images interview-integrity-api-gateway --format "{{.Repository}}" | findstr interview-integrity-api-gateway >nul
    if %errorlevel% neq 0 (
        echo [INSTALL] Loading Docker images... (This may take 2-3 minutes on first run)
        docker load -i docker-images.tar
        if %errorlevel% neq 0 (
            echo [ERROR] Failed to load Docker images
            pause
            exit /b 1
        )
        echo [OK] Docker images loaded successfully
    ) else (
        echo [OK] Docker images already loaded
    )
    echo.
)

REM Ask user for mode
echo Select mode:
echo   1. Live Interview Mode (requires webcam/microphone)
echo   2. Demo Mode (pre-recorded data, no webcam needed)
echo.
set /p mode="Enter choice (1 or 2): "
echo.

if "%mode%"=="1" (
    echo [START] Starting Live Interview Mode...
    cd infra
    docker-compose -f docker-compose.yml up -d
    cd ..
    timeout /t 5 /nobreak >nul
    echo [OK] Services starting in background
    echo [WEB] Opening browser...
    start http://localhost:3000
    echo.
    echo ====================================
    echo System is ready!
    echo ====================================
    echo.
    echo Web Interface: http://localhost:3000
    echo API Gateway:   http://localhost:8000
    echo.
    echo To stop the system, run: stop.bat
    echo.
) else if "%mode%"=="2" (
    echo [START] Starting Demo Mode...
    cd infra
    docker-compose -f docker-compose.demo.yml up -d
    cd ..
    timeout /t 5 /nobreak >nul
    echo [OK] Services starting in background
    echo [WEB] Opening browser...
    start http://localhost:3100
    echo.
    echo ====================================
    echo Demo System is ready!
    echo ====================================
    echo.
    echo Web Interface: http://localhost:3100
    echo.
    echo To stop the system, run: stop.bat
    echo.
) else (
    echo [ERROR] Invalid choice! Please enter 1 or 2.
    echo.
    pause
    exit /b 1
)

echo Note: Services may take 30-60 seconds to fully start.
echo       If the page doesn't load, wait a moment and refresh.
echo.
pause
