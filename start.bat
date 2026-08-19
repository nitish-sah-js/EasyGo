@echo off
echo Starting NextTour - API, Worker, and Web in separate windows...
echo Web will be available at http://localhost:3000
echo (login: demo@nexttour.local / password123)
echo.
start "NextTour API" cmd /k "npm run dev:api"
start "NextTour Worker" cmd /k "npm run dev:worker"
start "NextTour Web" cmd /k "npm run dev:web"
echo Done. Keep the three windows open.