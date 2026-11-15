@echo off
title Kurmatik Exchange - Local Sunucu
echo ===================================================
echo     Kurmatik Exchange Local Baslatiliyor...
echo ===================================================
echo.
cd /d "%~dp0"

echo Tarayici aciliyor: http://localhost:5173
start http://localhost:5173

echo Vite Dev Sunucusu calisiyor... (Kapatmak icin bu pencereyi kapatin)
echo.
npm run dev
pause
