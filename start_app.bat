@echo off
echo Starting Exchange App Server and Client...
echo.
echo Launching Backend Server on port 5000...
start "Exchange Server" cmd /k "cd server && npm start"
echo.
echo Launching Frontend Client...
start "Exchange Client" cmd /k "npm run dev"
echo.
echo App launching! Check the opened windows.
