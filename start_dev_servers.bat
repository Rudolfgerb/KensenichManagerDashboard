@echo off
cd /d "%~dp0backend"
start cmd /k npm run dev
cd /d "%~dp0frontend"
start cmd /k npm run dev
echo Both servers should be starting...
timeout /t 5