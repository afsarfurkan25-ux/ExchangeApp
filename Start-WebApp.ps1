$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Function to stop background processes when this script exits
$global:jobList = @()
Register-EngineEvent PowerShell.Exiting -Action {
    foreach ($job in $global:jobList) {
        $job | Stop-Job -PassThru | Remove-Job -Force
    }
}

Write-Host "Starting Background Servers..."

# Start backend
$backendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run build:server
    node server/dist/index.js
} -ArgumentList $scriptDir
$global:jobList += $backendJob

# Start frontend
$frontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run dev
} -ArgumentList $scriptDir
$global:jobList += $frontendJob

Write-Host "Servers started. Application is running at http://localhost:5173"
Write-Host "Keep this window open. Closing it will stop the servers."

# Wait indefinitely until the user closes the window
while ($true) {
    Start-Sleep -Seconds 1
}
