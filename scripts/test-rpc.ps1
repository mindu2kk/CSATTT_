# Test Hardhat RPC Connection
Write-Host "🧪 Testing Hardhat RPC Connection..." -ForegroundColor Cyan

$rpcUrl = "http://127.0.0.1:8545"
$body = @{
    jsonrpc = "2.0"
    method = "eth_chainId"
    params = @()
    id = 1
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri $rpcUrl -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.result) {
        $chainId = [int]"0x$($result.result)"
        Write-Host "✅ RPC Connection: SUCCESS" -ForegroundColor Green
        Write-Host "   Chain ID: $chainId" -ForegroundColor Green
        Write-Host "   Expected: 31337" -ForegroundColor Yellow
        
        if ($chainId -eq 31337) {
            Write-Host "   ✅ Chain ID matches!" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Chain ID mismatch!" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ RPC Response Error" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ RPC Connection: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Make sure Hardhat node is running:" -ForegroundColor Yellow
    Write-Host "   npx hardhat node" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 MetaMask Settings:" -ForegroundColor Cyan
Write-Host "   RPC URL: http://127.0.0.1:8545" -ForegroundColor White
Write-Host "   Chain ID: 31337" -ForegroundColor White
Write-Host "   Network: Hardhat Local" -ForegroundColor White
