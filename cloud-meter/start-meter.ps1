# Starts the AI cost meter helper (if it is not already running), opens the
# meter full screen in Edge on the second display when one is connected, and
# opens the Run of Show presenter page on the right edge of the main display.
# Run through start-meter.cmd. Works offline: everything stays on 127.0.0.1.
#   -ShowOnly    open only the Run of Show page
#   -MeterOnly   open only the meter
param([switch]$ShowOnly, [switch]$MeterOnly)
$ErrorActionPreference = "Stop"
$port = 7777   # keep in sync with "server.port" in config.json
$url = "http://127.0.0.1:$port"

function Test-Helper {
  try { Invoke-RestMethod "$url/api/health" -TimeoutSec 1 | Out-Null; return $true } catch { return $false }
}
function Test-ShowPage {
  try { return (Invoke-WebRequest "$url/show" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { return $false }
}

# A helper from an older copy of the meter (no /show page) blocks this one: stop it.
if ((Test-Helper) -and -not (Test-ShowPage)) {
  $old = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($old) {
    Write-Host "Stopping an older meter helper on port $port (PID $($old.OwningProcess))."
    Stop-Process -Id $old.OwningProcess -Force
    for ($i = 0; $i -lt 20 -and (Test-Helper); $i++) { Start-Sleep -Milliseconds 200 }
  }
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
if (-not $edge) {
  if (-not $ShowOnly) { Start-Process $url }
  if (-not $MeterOnly) { Start-Process "$url/show" }
  exit 0
}

# Separate profiles make Edge open new app windows with these sizes even if Edge is already running.
if (-not $ShowOnly) {
  $profileDir = Join-Path $env:LOCALAPPDATA "ai-cost-meter-edge"
  Start-Process -FilePath $edge -ArgumentList @(
    "--user-data-dir=`"$profileDir`"", "--no-first-run", "--no-default-browser-check",
    "--window-position=$pos", "--start-fullscreen", "--app=$url"
  )
  Write-Host "Meter open on $($screen.DeviceName) ($($screen.Bounds.Width)x$($screen.Bounds.Height)). Press F in the meter if it is not full screen."
}

# Run of Show: a narrow window on the right edge of the main display, next to AnythingLLM.
if (-not $MeterOnly) {
  $main = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
  $w = [Math]::Min(540, [int]($main.Width * 0.34))
  $showProfile = Join-Path $env:LOCALAPPDATA "ai-cost-meter-show"
  Start-Process -FilePath $edge -ArgumentList @(
    "--user-data-dir=`"$showProfile`"", "--no-first-run", "--no-default-browser-check",
    "--window-position=$($main.Right - $w),$($main.Top)", "--window-size=$w,$($main.Height)", "--app=$url/show"
  )
  Write-Host "Run of Show open on the right of the main display. Put AnythingLLM on the left."
}
