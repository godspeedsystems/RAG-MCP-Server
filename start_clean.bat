@echo off
:: Kill any process using port 10947
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :10947') do taskkill /F /PID %%a >nul 2>&1

:: Start godspeed serve
godspeed serve
