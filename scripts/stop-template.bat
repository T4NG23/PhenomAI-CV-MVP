@echo off
REM Stop All Services Script
REM Version: 0.1.0

echo ====================================
echo Stopping Interview Integrity System
echo ====================================
echo.

echo [STOP] Stopping all services...

cd infra

REM Stop both live and demo mode containers
docker-compose -f docker-compose.yml down 2>nul
docker-compose -f docker-compose.demo.yml down 2>nul

cd ..

echo [OK] All services stopped
echo.
echo You can now close this window.
echo.
pause
