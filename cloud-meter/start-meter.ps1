# Starts the AI cost meter helper (if it is not already running) and opens the
# meter full screen in Edge, on the second display when one is connected.
# Run through start-meter.cmd. Works offline: everything stays on 127.0.0.1.
$ErrorActionPreference = "Stop"
$port = 7777   # keep in sync with "server.port" in config.json
$url = "http://127.0.0.1:$port"

function Test-Helper {
  try { Invoke-RestMethod "$url/api/health" -TimeoutSec 1 | Out-Null; return $true } catch { return $false }
}

if (-not (Test-Helper)) {
  Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $PSScriptRoot -WindowStyle Minimized
  for ($i = 0; $i -lt 30 -and -not (Test-Helper); $i++) { Start-Sleep -Milliseconds 300 }
  if (-not (Test-Helper)) { Write-Host "The meter helper did not start. Run 'node server.js' in $PSScriptRoot to see why."; Read-Host "Press Enter to close"; exit 1 }
}

# Pick a non-primary display if there is one, otherwise the primary.
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::AllScreens | Sort-Object Primary | Select-Object -First 1
$pos = "{0},{1}" -f $screen.Bounds.X, $screen.Bounds.Y

$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Start-Process $url; exit 0 }

# A separate profile makes Edge open a new full-screen app window even if Edge is already running.
$profileDir = Join-Path $env:LOCALAPPDATA "ai-cost-meter-edge"
Start-Process -FilePath $edge -ArgumentList @(
  "--user-data-dir=`"$profileDir`"", "--no-first-run", "--no-default-browser-check",
  "--window-position=$pos", "--start-fullscreen", "--app=$url"
)
Write-Host "Meter open on $($screen.DeviceName) ($($screen.Bounds.Width)x$($screen.Bounds.Height)). Press F in the meter if it is not full screen."
