@echo off
echo ========================================
echo   FLASK FRONTEND SERVER
echo ========================================
echo.

echo [1/3] Checking Hardhat node...
netstat -ano | findstr :8545 >nul
if %errorlevel% neq 0 (
    echo [WARN] Hardhat node is NOT running!
    echo        Please start it first: npx hardhat node
    echo        (In another terminal)
    echo.
) else (
    echo [OK] Hardhat node is running
    echo.
)

echo [2/3] Checking contracts...
if not exist "..\web\contracts.json" (
    echo [WARN] Contracts not deployed!
    echo        Deploying contracts...
    cd ..
    call npm run deploy
    cd FE
    echo.
)

echo [3/3] Starting Flask server...
echo.
echo Server will start at: http://localhost:5000
echo User Interface: http://localhost:5000/home
echo Admin Interface: http://localhost:5000/admin
echo API Status: http://localhost:5000/api/blockchain/status
echo.
echo Press Ctrl+C to stop
echo.

python sach.py

pause

