#!/usr/bin/env bash
# Upload a .apk/.ipa to Diawi and print the install link + QR.
# Usage: ./scripts/diawi-upload.sh <file> [comment]
# Token comes from DIAWI_TOKEN (env, or apps/mobile/.env.local — gitignored).
set -euo pipefail
cd "$(dirname "$0")/.."                        # -> apps/mobile
set -a; [ -f .env.local ] && . ./.env.local; set +a
: "${DIAWI_TOKEN:?Set DIAWI_TOKEN in apps/mobile/.env.local}"

FILE="${1:?usage: diawi-upload.sh <file> [comment]}"
COMMENT="${2:-RxNote build}"

JOB=$(curl -s https://upload.diawi.com/ \
  -F token="$DIAWI_TOKEN" -F file=@"$FILE" -F comment="$COMMENT" -F wall_of_apps=0 \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('job',''))")
[ -z "$JOB" ] && { echo "✗ Diawi upload rejected (file too large? free tier caps ~50 MB)"; exit 1; }

for _ in $(seq 1 20); do
  R=$(curl -s "https://upload.diawi.com/status?token=${DIAWI_TOKEN}&job=${JOB}")
  ST=$(printf '%s' "$R" | python3 -c "import sys,json;print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")
  case "$ST" in
    2000) printf '%s' "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);print('✓ Install link:',d['link']);print('  QR:          ',d['qrcode'])"; exit 0;;
    4000) echo "✗ Diawi error: $R"; exit 1;;
    *) sleep 2;;
  esac
done
echo "… still processing after 40 s — check https://dashboard.diawi.com"; exit 1
