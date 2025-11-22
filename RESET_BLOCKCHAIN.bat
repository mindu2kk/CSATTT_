@echo off
echo ===============================================
echo   RESET BLOCKCHAIN - Full Clean Restart
echo ===============================================
echo.

echo Step 1: Stopping any running Hardhat nodes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 >nul

echo.
echo Step 2: Cleaning artifacts and cache...
if exist artifacts rmdir /s /q artifacts
if exist cache rmdir /s /q cache
if exist typechain-types rmdir /s /q typechain-types

echo.
echo Step 3: Starting fresh Hardhat node...
start "Hardhat Node" cmd /k "npx hardhat node"
timeout /t 5

echo.
echo Step 4: Deploying contracts...
timeout /t 3
npx hardhat run scripts/deploy.ts --network localhost

echo.
echo ===============================================
echo   BLOCKCHAIN RESET COMPLETE!
echo ===============================================
echo.
echo Next steps:
echo 1. Refresh your browser (Ctrl + Shift + R)
echo 2. Reconnect MetaMask
echo 3. Mint new books from admin page
echo.
pause

