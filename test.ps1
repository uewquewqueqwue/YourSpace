# test-processes.ps1
Write-Host "=== TESTING PROCESS METHODS ===" -ForegroundColor Cyan

# Метод 1: Get-Process
Write-Host "`n1. Get-Process:" -ForegroundColor Yellow
try {
    $processes = Get-Process | Select-Object -First 5 Name, Id, Path
    $processes | ConvertTo-Json
    Write-Host "✅ Get-Process OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Get-Process failed: $_" -ForegroundColor Red
}

# Метод 2: tasklist
Write-Host "`n2. tasklist:" -ForegroundColor Yellow
try {
    $output = tasklist /fo csv /nh | Select-Object -First 5
    $output
    Write-Host "✅ tasklist OK" -ForegroundColor Green
} catch {
    Write-Host "❌ tasklist failed: $_" -ForegroundColor Red
}

# Метод 3: WMIC (если есть)
Write-Host "`n3. WMIC:" -ForegroundColor Yellow
try {
    $wmic = Get-Command wmic -ErrorAction SilentlyContinue
    if ($wmic) {
        $output = wmic process get Caption,ProcessId /format:csv | Select-Object -First 5
        $output
        Write-Host "✅ WMIC OK" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ WMIC not found in system" -ForegroundColor Magenta
    }
} catch {
    Write-Host "❌ WMIC failed: $_" -ForegroundColor Red
}

Read-Host "`nPress Enter to exit"