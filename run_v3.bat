@echo off
echo Redesigning QLVB V3 - Starting Services...
echo.

echo [1/2] Launching Backend (Django)...
start powershell -NoExit -ExecutionPolicy Bypass -Command "cd backend; .\venv\Scripts\Activate.ps1; python manage.py runserver 0.0.0.0:8000"

echo [2/2] Launching Frontend (React)...
start powershell -NoExit -ExecutionPolicy Bypass -Command "cd frontend-v3; set BROWSER=none; npm start"

echo.
echo All services are starting in separate windows.
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:3000
pause
