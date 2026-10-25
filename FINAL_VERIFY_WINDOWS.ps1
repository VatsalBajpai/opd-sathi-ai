$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " OPD Saathi AI - Runtime Smoke Test" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if (-not (Test-Path '.next')) {
  throw 'Production build (.next) not found. Run npm.cmd run build first.'
}

$port = 3100
$proc = $null
try {
  $proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "npm.cmd start -- -p $port" -PassThru -WindowStyle Hidden

  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/health" -Method Get -TimeoutSec 2
      if ($health.ok) { $ready = $true; break }
    } catch {}
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'Production server did not become ready.' }

  Write-Host '[PASS] /api/health' -ForegroundColor Green

  $home = Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 5
  if ($home.StatusCode -ne 200) { throw 'Home page did not return HTTP 200.' }
  Write-Host '[PASS] Home page HTTP 200' -ForegroundColor Green

  $chatBody = @{ messages = @(@{ role = 'user'; content = 'Where is cardiology?' }) } | ConvertTo-Json -Depth 5
  $chat = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/chat" -Method Post -ContentType 'application/json' -Body $chatBody -TimeoutSec 5
  if (-not $chat.reply) { throw 'Zero-key Saathi did not return a reply.' }
  Write-Host '[PASS] Zero-key Saathi reply' -ForegroundColor Green

  $hospitalBody = @{
    latitude = 12.9716; longitude = 77.5946; accuracy = 1500; timestamp = 1; demoMode = $true; careNeed = 'ent'
  } | ConvertTo-Json
  $hospitals = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/nearby-hospitals" -Method Post -ContentType 'application/json' -Body $hospitalBody -TimeoutSec 5
  if (-not $hospitals.hospitals -or $hospitals.hospitals.Count -lt 1) { throw 'Bengaluru demo hospital list is empty.' }
  Write-Host "[PASS] Bengaluru demo hospitals ($($hospitals.hospitals.Count) results)" -ForegroundColor Green

  $routeBody = @{
    origin = @{ latitude = 12.9716; longitude = 77.5946 }
    destination = @{ latitude = 12.996145; longitude = 77.569369 }
    demoMode = $true
  } | ConvertTo-Json -Depth 5
  $route = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/route-to-hospital" -Method Post -ContentType 'application/json' -Body $routeBody -TimeoutSec 5
  if (-not $route.distanceMeters -or -not $route.durationSeconds) { throw 'Demo route response is incomplete.' }
  Write-Host '[PASS] Instant demo route' -ForegroundColor Green

  Write-Host "==========================================" -ForegroundColor Green
  Write-Host " RUNTIME SMOKE TEST PASSED" -ForegroundColor Green
  Write-Host "==========================================" -ForegroundColor Green
} finally {
  if ($proc -and -not $proc.HasExited) {
    & taskkill /PID $proc.Id /T /F | Out-Null
  }
}
