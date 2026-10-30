@echo off
cd /d "%~dp0"
node -v >nul 2>&1 || (echo Node.js is not installed. Install it from https://nodejs.org and run this again. & pause & exit /b)
echo Starting NEPSHOPWEB...
start "" http://localhost:8080
node server.js
pause
