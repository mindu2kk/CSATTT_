@echo off
echo ========================================
echo   BLOCKCHAIN PYTHON SERVER
echo ========================================

echo 📦 Installing dependencies...
pip install -r requirements.txt

echo.
echo 🔍 Checking contracts...
if not exist "..\web\contracts.json" (
    echo ⚠️ Contracts not found! Deploying first...
    cd ..
    call npm run deploy
    cd python-blockchain-server
)

echo.
echo 🚀 Starting server...
echo 🌐 API: http://localhost:8001
echo 📚 Docs: http://localhost:8001/docs
echo.

python blockchain_server.py

pause