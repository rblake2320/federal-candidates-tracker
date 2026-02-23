#!/bin/bash
# ── BallotWatch Tunnel Watchdog ──────────────────────────────
# Monitors the Cloudflare quick tunnel and auto-restarts on failure.
# Also rebuilds + redeploys the frontend when the tunnel URL changes.
#
# Usage: bash scripts/tunnel-watchdog.sh
# Stop:  kill $(cat ~/.ballotwatch-watchdog.pid)

TRACKER_DIR="D:/Tracker"
LOG_FILE="$HOME/cloudflared_tunnel.log"
PID_FILE="$HOME/.ballotwatch-watchdog.pid"
TUNNEL_URL_FILE="$HOME/.ballotwatch-tunnel-url"
CHECK_INTERVAL=30  # seconds between health checks
MAX_FAILURES=3     # consecutive failures before restart

echo $$ > "$PID_FILE"

# ── Helper: extract tunnel URL from cloudflared log ──────────
get_tunnel_url() {
  grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | tail -1
}

# ── Helper: start tunnel ─────────────────────────────────────
start_tunnel() {
  # Kill any existing cloudflared
  pkill -f "cloudflared tunnel" 2>/dev/null
  sleep 2

  # Clear old log
  > "$LOG_FILE"

  # Start fresh tunnel
  nohup cloudflared tunnel --url http://localhost:3001 > "$LOG_FILE" 2>&1 &
  echo "[$(date)] Started cloudflared (PID: $!)"

  # Wait for URL to appear
  for i in $(seq 1 20); do
    sleep 2
    URL=$(get_tunnel_url)
    if [ -n "$URL" ]; then
      echo "[$(date)] Tunnel URL: $URL"
      echo "$URL" > "$TUNNEL_URL_FILE"
      return 0
    fi
  done

  echo "[$(date)] ERROR: Tunnel failed to start after 40s"
  return 1
}

# ── Helper: rebuild + redeploy frontend ──────────────────────
redeploy() {
  local url="$1"
  echo "[$(date)] Rebuilding frontend with API URL: $url/api/v1"

  # Update .env.production
  echo "VITE_API_URL=${url}/api/v1" > "${TRACKER_DIR}/.env.production"

  # Build
  cd "$TRACKER_DIR"
  npm run build:client > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo "[$(date)] ERROR: Frontend build failed"
    return 1
  fi

  # Deploy
  npx wrangler pages deploy dist/client --project-name=ballotwatch --branch=main --commit-dirty=true > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo "[$(date)] ERROR: Pages deploy failed"
    return 1
  fi

  echo "[$(date)] Deployed to https://ballotwatch.pages.dev"

  # Windows toast notification
  powershell.exe -Command "
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > \$null
    \$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    \$textNodes = \$template.GetElementsByTagName('text')
    \$textNodes.Item(0).AppendChild(\$template.CreateTextNode('BallotWatch Tunnel Restarted')) > \$null
    \$textNodes.Item(1).AppendChild(\$template.CreateTextNode('New URL: $url')) > \$null
    \$toast = [Windows.UI.Notifications.ToastNotification]::new(\$template)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('BallotWatch').Show(\$toast)
  " 2>/dev/null

  return 0
}

# ── Helper: send desktop notification ────────────────────────
notify() {
  local title="$1"
  local message="$2"
  powershell.exe -Command "
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > \$null
    \$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    \$textNodes = \$template.GetElementsByTagName('text')
    \$textNodes.Item(0).AppendChild(\$template.CreateTextNode('$title')) > \$null
    \$textNodes.Item(1).AppendChild(\$template.CreateTextNode('$message')) > \$null
    \$toast = [Windows.UI.Notifications.ToastNotification]::new(\$template)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('BallotWatch').Show(\$toast)
  " 2>/dev/null
}

# ── Main Loop ────────────────────────────────────────────────
echo "[$(date)] BallotWatch Tunnel Watchdog started"
echo "[$(date)] Checking every ${CHECK_INTERVAL}s, restart after ${MAX_FAILURES} failures"

failures=0

# Initial startup
CURRENT_URL=$(get_tunnel_url)
if [ -z "$CURRENT_URL" ] || ! curl -sf "${CURRENT_URL}/health" > /dev/null 2>&1; then
  echo "[$(date)] No active tunnel found, starting one..."
  start_tunnel
  CURRENT_URL=$(get_tunnel_url)
  if [ -n "$CURRENT_URL" ]; then
    redeploy "$CURRENT_URL"
  fi
else
  echo "[$(date)] Existing tunnel active: $CURRENT_URL"
fi

while true; do
  sleep "$CHECK_INTERVAL"

  CURRENT_URL=$(cat "$TUNNEL_URL_FILE" 2>/dev/null)

  if [ -z "$CURRENT_URL" ]; then
    echo "[$(date)] No tunnel URL found, restarting..."
    start_tunnel
    CURRENT_URL=$(get_tunnel_url)
    [ -n "$CURRENT_URL" ] && redeploy "$CURRENT_URL"
    failures=0
    continue
  fi

  # Health check
  if curl -sf "${CURRENT_URL}/health" > /dev/null 2>&1; then
    if [ $failures -gt 0 ]; then
      echo "[$(date)] Tunnel recovered after $failures failures"
      failures=0
    fi
  else
    failures=$((failures + 1))
    echo "[$(date)] Health check failed ($failures/$MAX_FAILURES)"

    if [ $failures -ge $MAX_FAILURES ]; then
      echo "[$(date)] Max failures reached, restarting tunnel..."
      notify "BallotWatch" "Tunnel down — restarting..."

      start_tunnel
      NEW_URL=$(get_tunnel_url)

      if [ -n "$NEW_URL" ] && [ "$NEW_URL" != "$CURRENT_URL" ]; then
        echo "[$(date)] URL changed: $CURRENT_URL → $NEW_URL"
        redeploy "$NEW_URL"
      elif [ -n "$NEW_URL" ]; then
        echo "[$(date)] Tunnel restarted with same URL"
      fi

      failures=0
    fi
  fi
done
