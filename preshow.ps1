# Pre-show reset. Run through preshow.cmd (or the "Demo Pre-show Reset" desktop
# shortcut) after the last rehearsal, right before going on stage.
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Scripts = Join-Path $Root "demo-kit\scripts"

function Step($n, $text) { Write-Host ""; Write-Host "[$n] $text" -ForegroundColor Cyan }
function Fail($text) { Write-Host "    FAIL $text" -ForegroundColor Red; Read-Host "Press Enter to close"; exit 1 }
# Runs a demo-kit script on this console and returns only its exit code.
function Run-Node($script, [string[]]$scriptArgs = @()) {
  $p = Start-Process -FilePath "node" -ArgumentList (@($script) + $scriptArgs) -WorkingDirectory $Scripts -NoNewWindow -Wait -PassThru
  return $p.ExitCode
}
try { Invoke-RestMethod "http://127.0.0.1:3001/api/ping" -TimeoutSec 2 | Out-Null } catch { Fail "AnythingLLM is not running. Open it, wait until it has loaded, then run this again." }

Step 1 "Workspaces back to the plan (removes the RFP from Deal Room after rehearsals)"
if ((Run-Node "setup-workspaces.mjs") -ne 0) { Fail "Workspaces do not match the plan. See above." }

Step 2 "Clear chat history in the demo workspaces"
if ((Run-Node "reset-chats.mjs" @("--yes")) -ne 0) { Fail "Chats could not be cleared." }

Step 3 "Encore check"
$bidDesk = (Run-Node "check-encore.mjs") -eq 0
if ($bidDesk) { Write-Host "    The encore is ready." -ForegroundColor Green }
else { Write-Host "    The encore is not ready (see above). Fine if you are not doing it." -ForegroundColor Yellow }

Step 4 "Your part"
Write-Host "    - Close Ollama (tray icon, Quit), Spotify and other heavy apps. Free memory is tight."
Write-Host "    - Unplug the charger and turn on airplane mode."
Read-Host "    Press Enter when done"

Step 5 "Warm up: Deal Room first, then Quick Answers (so the fast lane starts warm)"
foreach ($ws in @("deal-room", "quick-answers")) {
  if ((Run-Node "prewarm.mjs" @($ws, "--no-wait")) -ne 0) { Fail "Warm-up of $ws failed. Check that AnythingLLM shows the GenieX models as downloaded." }
}

Step 6 "Remove the warm-up chats (the model stays loaded)"
if ((Run-Node "reset-chats.mjs" @("--yes")) -ne 0) { Fail "Chats could not be cleared." }

Step 7 "Start the cost meter"
& (Join-Path $Root "cloud-meter\start-meter.cmd")
Write-Host ""
Write-Host "Ready. On the meter: check the status reads 'Live - AnythingLLM' (green), then press R." -ForegroundColor Green
Write-Host "In AnythingLLM: open Quick Answers. Never click Stop on a reply."
Read-Host "Press Enter to close"
