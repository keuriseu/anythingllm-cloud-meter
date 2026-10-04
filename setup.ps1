# One-time setup for the AnythingLLM demo and the AI cost meter.
# Run through setup.cmd. Safe to re-run: every step checks first and only
# changes what is missing. -SkipShortcuts leaves the desktop alone.
param([switch]$SkipShortcuts)
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Scripts = Join-Path $Root "demo-kit\scripts"
$Api = "http://127.0.0.1:3001/api"

function Step($n, $text) { Write-Host ""; Write-Host "[$n] $text" -ForegroundColor Cyan }
function Ok($text) { Write-Host "    OK   $text" -ForegroundColor Green }
function Todo($text) { Write-Host "    ...  $text" -ForegroundColor Yellow }
function Fail($text) { Write-Host "    FAIL $text" -ForegroundColor Red; Read-Host "Press Enter to close"; exit 1 }
function Ask($q) { (Read-Host "$q [y/N]") -match '^(y|yes)$' }
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User") }
# Runs a demo-kit script on this console and returns only its exit code.
function Run-Node($script, [string[]]$scriptArgs = @()) {
  $p = Start-Process -FilePath "node" -ArgumentList (@($script) + $scriptArgs) -WorkingDirectory $Scripts -NoNewWindow -Wait -PassThru
  return $p.ExitCode
}

Write-Host "AnythingLLM demo kit setup" -ForegroundColor White
Write-Host "Folder: $Root"
$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -ne "ARM64") { Write-Host "    Note: this PC reports $arch. The demo is built for Snapdragon X (ARM64); GenieX models need the Snapdragon NPU." -ForegroundColor Yellow }

# 1. Node.js -------------------------------------------------------------------
Step 1 "Node.js 18 or newer"
Refresh-Path
$nodeOk = $false
try { $v = (& node -v) 2>$null; if ($v -match '^v(\d+)\.' -and [int]$Matches[1] -ge 18) { $nodeOk = $true; Ok "Node $v" } } catch {}
if (-not $nodeOk) {
  Todo "Node.js is missing or older than 18."
  if (Ask "    Install Node.js LTS now with winget?") {
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
    Refresh-Path
    try { $v = (& node -v) 2>$null } catch { $v = $null }
    if (-not $v) { Fail "Node.js still not found. Close this window, open a new one and run setup.cmd again." }
    Ok "Node $v"
  } else { Fail "Install Node.js LTS from https://nodejs.org, then run setup.cmd again." }
}

# 2. AnythingLLM ---------------------------------------------------------------
Step 2 "AnythingLLM Desktop running"
function Test-Allm { try { Invoke-RestMethod "$Api/ping" -TimeoutSec 2 | Out-Null; return $true } catch { return $false } }
if (-not (Test-Allm)) {
  $exe = Join-Path $env:LOCALAPPDATA "Programs\AnythingLLM\AnythingLLM.exe"
  if (-not (Test-Path $exe)) {
    Todo "AnythingLLM Desktop is not installed."
    Write-Host "    Download the Windows ARM64 version from https://anythingllm.com/desktop, install it, open it once,"
    Write-Host "    and choose AnythingLLM GenieX as the LLM provider during onboarding."
    Start-Process "https://anythingllm.com/desktop"
    Read-Host "    Press Enter when AnythingLLM is installed and open"
  } else {
    Todo "Starting AnythingLLM..."
    Start-Process $exe
  }
  for ($i = 0; $i -lt 60 -and -not (Test-Allm); $i++) { Start-Sleep -Seconds 2 }
  if (-not (Test-Allm)) { Fail "AnythingLLM is not answering on 127.0.0.1:3001. Open it, wait until it has loaded, then run setup.cmd again." }
}
Ok "AnythingLLM is answering on 127.0.0.1:3001"

# 3. Developer API key ---------------------------------------------------------
Step 3 "AnythingLLM developer API key"
function Test-Key($k) {
  if (-not $k) { return $false }
  try { Invoke-RestMethod "$Api/v1/auth" -Headers @{ Authorization = "Bearer $k" } -TimeoutSec 5 | Out-Null; return $true } catch { return $false }
}
$key = [Environment]::GetEnvironmentVariable("ANYTHINGLLM_API_KEY", "User")
if (Test-Key $key) { Ok "saved key works" }
else {
  if ($key) { Todo "The saved key was rejected (it may have been deleted in AnythingLLM)." }
  Write-Host "    In AnythingLLM: Settings (wrench icon), Tools, Developer API, Generate New API Key, then Copy."
  for ($try = 0; $try -lt 3; $try++) {
    $secure = Read-Host "    Paste the key here (input is hidden)" -AsSecureString
    $key = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
    if (Test-Key $key) { break }
    Todo "That key did not work. Try again."
    $key = $null
  }
  if (-not $key) { Fail "No working API key." }
  # Stored only as a Windows user environment variable, never in a file.
  [Environment]::SetEnvironmentVariable("ANYTHINGLLM_API_KEY", $key, "User")
  Ok "key saved as the ANYTHINGLLM_API_KEY user environment variable"
}
$env:ANYTHINGLLM_API_KEY = $key

# 4. Models and AI settings ----------------------------------------------------
Step 4 "GenieX models and AI settings (first run downloads about 5.2 GB)"
if ((Run-Node "setup-ai.mjs") -ne 0) { Fail "Fix the items marked FIX above, then run setup.cmd again." }

# 5. Demo workspaces -----------------------------------------------------------
Step 5 "Quick Answers and Deal Room workspaces with the six demo documents"
if ((Run-Node "setup-workspaces.mjs") -ne 0) { Fail "The workspaces could not be set up. See above." }

# 6. Optional encore -----------------------------------------------------------
Step 6 "Optional: Model Router encore (needs the internet and a paid OpenRouter account)"
if (Ask "    Set up the encore now?") {
  $code = Run-Node "setup-encore.mjs"
  if ($code -eq 2) {
    Start-Process "https://openrouter.ai/keys"
    Read-Host "    Add the OpenRouter key in AnythingLLM as described above, then press Enter"
    $code = Run-Node "setup-encore.mjs"
  }
  if ($code -ne 0) { Write-Host "    Encore not set up. You can run demo-kit\scripts\setup-encore.mjs later." -ForegroundColor Yellow }
} else { Write-Host "    Skipped. Run 'node setup-encore.mjs' in demo-kit\scripts any time." }

# 7. Desktop shortcuts ---------------------------------------------------------
Step 7 "Desktop shortcuts"
if ($SkipShortcuts) { Write-Host "    Skipped (-SkipShortcuts)." } else {
$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
function Make-Shortcut($name, $target, $hotkey, $minimized, $desc, $arguments) {
  $s = $shell.CreateShortcut((Join-Path $desktop "$name.lnk"))
  $s.TargetPath = $target
  if ($arguments) { $s.Arguments = $arguments }
  $s.WorkingDirectory = Split-Path $target
  $s.Description = $desc
  if ($hotkey) { $s.Hotkey = $hotkey }
  if ($minimized) { $s.WindowStyle = 7 }
  $s.Save()
  Ok "$name$(if ($hotkey) { " ($hotkey)" })"
}
Make-Shortcut "AI Cost Meter" (Join-Path $Root "cloud-meter\start-meter.cmd") $null $true "Opens the AI cost meter on the second display and the Run of Show on this one"
Make-Shortcut "Run of Show" (Join-Path $Root "cloud-meter\start-meter.cmd") $null $true "Opens the presenter page with copy buttons for every prompt" "-ShowOnly"
Make-Shortcut "Demo Pre-show Reset" (Join-Path $Root "preshow.cmd") $null $false "Resets workspaces and chats, warms up the models, starts the meter"
Make-Shortcut "Pre-warm Deal Room" (Join-Path $Scripts "prewarm-deal-room.cmd") "Ctrl+Alt+W" $true "Loads the Deal Room model; press Ctrl+Alt+W on stage after Q3"
}

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "On show day, double-click 'Demo Pre-show Reset' on the desktop. The run of show is in docs\STAGE_SCRIPT.md."
Read-Host "Press Enter to close"
