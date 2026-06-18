#!/bin/bash
# Screenshot a template's full-deck contact sheet to /tmp/qa-<id>.png.
# Usage: qa-shot.sh <template-id> [window-height]
# Requires the QA server running on :8799 (MOLDABLE_PORT=8799 npx tsx src/server/index.ts).
set -e
ID="$1"
H="${2:-3400}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="/tmp/qa-${ID}.png"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1500,${H} \
  --screenshot="$OUT" "http://127.0.0.1:8799/api/templates/${ID}/contact.html" \
  --virtual-time-budget=10000 >/dev/null 2>&1
echo "$OUT"
