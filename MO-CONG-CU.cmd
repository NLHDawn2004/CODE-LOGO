@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can cai Node.js de nap logo tu Google Drive.
  echo Tai tai https://nodejs.org/ roi mo lai tep nay.
  pause
  exit /b 1
)
powershell -NoProfile -Command "$nodePath = (Get-Command node.exe).Source; Start-Process -FilePath $nodePath -ArgumentList 'drive-server.cjs' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden; $ready = $false; for ($attempt = 0; $attempt -lt 20; $attempt++) { try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:18764/api/health' -TimeoutSec 1; if ($health.app -eq 'HD CODE LOGO') { $ready = $true; break } } catch {}; Start-Sleep -Milliseconds 250 }; if ($ready) { Start-Process 'http://127.0.0.1:18764/' } else { Write-Host 'Khong mo duoc cong cu. Hay kiem tra cong 18764.'; Read-Host 'Nhan Enter de dong' }"
endlocal
