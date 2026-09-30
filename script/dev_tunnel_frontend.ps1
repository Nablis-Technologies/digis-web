# Expose the Vite dev server over public HTTPS and point the backend's
# CHAPA_RETURN_URL at it, so a buyer who is redirected back after paying lands
# on the SPA (which handles `?status=return` and confirms the payment) instead of
# the Rails welcome page.
#
# Chapa V2 requires an https callback/return URL, so http://localhost:5173 can
# never be the return URL. This starts a cloudflared QUICK tunnel for :5173,
# captures its URL, writes CHAPA_RETURN_URL into the backend's .env.chapa, and
# recreates the backend web container. Vite already allows *.trycloudflare.com
# (see vite.config.ts server.allowedHosts).
#
# NOTE: a quick-tunnel URL is EPHEMERAL — it changes every restart, so re-run
# this script (and re-checkout) whenever you restart the tunnel. The ngrok
# BACKEND tunnel stays stable (script/dev_tunnels.ps1 in digis_backend).
#
# Caveat: the buyer's app tab and the return URL must share an origin for
# localStorage (session, digis:payment-* keys) to carry over. If you browse the
# app at http://localhost:5173, the return tab (on the tunnel origin) has no
# session; the still-open app tab's popup poll is what actually confirms and
# closes the Chapa tab. Browsing the app ON the tunnel URL makes the return URL
# fully self-contained.
#
# Usage (from the digis-web repo root):
#   powershell -File script/dev_tunnel_frontend.ps1

param(
  [string] $BackendDir = (Join-Path $PSScriptRoot '..\..\digis_backend'),
  [int]    $FrontendPort = 5173
)

$ErrorActionPreference = 'Stop'

$cloudflared = 'cloudflared'
if (-not (Get-Command $cloudflared -ErrorAction SilentlyContinue)) {
  $fallback = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
  if (Test-Path $fallback) { $cloudflared = $fallback }
  else { throw "cloudflared not found. Install it: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" }
}

$log = Join-Path $env:TEMP 'digis-frontend-tunnel.log'
if (Test-Path $log) { Remove-Item $log -Force }
$out = Join-Path $env:TEMP 'digis-frontend-tunnel.out'

Write-Host "Starting cloudflared quick tunnel for http://localhost:$FrontendPort ..." -ForegroundColor Cyan
Start-Process -FilePath $cloudflared `
  -ArgumentList "tunnel --url http://localhost:$FrontendPort --no-autoupdate" `
  -RedirectStandardError $log -RedirectStandardOutput $out -WindowStyle Hidden

$url = $null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches -ErrorAction SilentlyContinue |
        ForEach-Object { $_.Matches.Value } | Select-Object -Unique -First 1
  if ($m) { $url = $m; break }
}
if (-not $url) { throw "Could not read the tunnel URL from $log. Check that log." }
Write-Host "Frontend tunnel: $url" -ForegroundColor Green

# Verify the SPA answers over the tunnel before wiring it.
$reachable = $false
for ($i = 0; $i -lt 15; $i++) {
  try { if ((Invoke-WebRequest -Uri "$url/?status=return" -TimeoutSec 15 -UseBasicParsing).StatusCode -eq 200) { $reachable = $true; break } } catch { }
  Start-Sleep -Seconds 2
}
if (-not $reachable) { Write-Warning "Could not reach $url — wiring CHAPA_RETURN_URL anyway." }

$envPath = Join-Path $BackendDir '.env.chapa'
if (-not (Test-Path $envPath)) { throw "No .env.chapa at $envPath (set -BackendDir to the digis_backend path)." }
$text = [System.IO.File]::ReadAllText($envPath, [System.Text.Encoding]::UTF8)
$text = [System.Text.RegularExpressions.Regex]::Replace($text, '(?m)^CHAPA_RETURN_URL=.*$', "CHAPA_RETURN_URL=$url/?status=return")
[System.IO.File]::WriteAllText($envPath, $text, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Wrote CHAPA_RETURN_URL=$url/?status=return to $envPath" -ForegroundColor Green

Write-Host 'Recreating the backend web container...' -ForegroundColor Cyan
docker compose --project-directory $BackendDir up -d --force-recreate web | Out-Null
Write-Host 'Done. Re-run this script whenever the tunnel restarts (the URL changes).' -ForegroundColor Green
