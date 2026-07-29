#!/usr/bin/env bash
# Upload a .apk/.ipa to Diawi and print the install link + QR.
#
#   ./scripts/diawi-upload.sh dist/RxNote-1.0.0-….apk
#   ./scripts/diawi-upload.sh <file> "comment shown in the Diawi dashboard"
#   ./scripts/diawi-upload.sh <file> --password=hunter2
#
# TOKEN
#   DIAWI_TOKEN, from the shell env or .env.local (gitignored). Get one at
#   https://dashboard.diawi.com → Account → API access.
#
# A DIAWI LINK IS AN UNLISTED PUBLIC URL
#   Anyone holding it can download the app — there is no tester allowlist. This build
#   points at production (rxnote.ai) with the live Clerk key, so prefer passing a
#   --password, and prefer Firebase App Distribution for anything longer-lived: it has a
#   real tester list, no size ceiling, and no link expiry.
#
# FREE TIER
#   Free links EXPIRE (Diawi advertises "no expiration" as a paid feature) and there is a
#   file-size ceiling. Diawi doesn't publish the exact number and it has changed over
#   time, so this script only warns above DIAWI_WARN_MB (default 60) and lets the API be
#   the authority — a rejected upload is reported as such rather than pre-empted.
set -euo pipefail
cd "$(dirname "$0")/.."

# .env.local is gitignored; `set -a` exports what it defines so DIAWI_TOKEN lands in env.
set -a; [ -f .env.local ] && . ./.env.local; set +a

if [ -z "${DIAWI_TOKEN:-}" ]; then
  cat >&2 <<'EOF'
✗ DIAWI_TOKEN is not set.
  Get a token at https://dashboard.diawi.com → Account → API access, then:
      echo 'DIAWI_TOKEN=your_token_here' >> .env.local
  .env.local is gitignored — the token must never be committed.
EOF
  exit 1
fi

FILE="${1:-}"
[ -n "$FILE" ] || { echo "✗ usage: diawi-upload.sh <file.apk|file.ipa> [comment] [--password=…]"; exit 1; }
[ -f "$FILE" ] || { echo "✗ no such file: $FILE"; exit 1; }
shift

COMMENT="RxNote build"
PASSWORD=""
for a in "$@"; do
  case "$a" in
    --password=*) PASSWORD="${a#*=}" ;;
    --*) echo "✗ unknown flag: $a"; exit 1 ;;
    *) COMMENT="$a" ;;
  esac
done

SIZE_MB=$(( $(wc -c < "$FILE") / 1048576 ))
WARN_MB="${DIAWI_WARN_MB:-60}"
echo "▸ ${FILE} (${SIZE_MB} MB)"
if [ "$SIZE_MB" -gt "$WARN_MB" ]; then
  echo "⚠ ${SIZE_MB} MB may exceed the free-tier ceiling — if it's rejected, build the"
  echo "  'share' target (npm run apk) instead of 'universal'."
fi

# --- upload -------------------------------------------------------------------
# wall_of_apps=0 keeps the build off Diawi's public showcase.
UPLOAD_ARGS=(-F token="$DIAWI_TOKEN" -F file=@"$FILE" -F comment="$COMMENT" -F wall_of_apps=0)
if [ -n "$PASSWORD" ]; then
  UPLOAD_ARGS+=(-F password="$PASSWORD")
  echo "▸ Password protection: on"
else
  echo "⚠ No --password — anyone with the link can install this build."
fi

echo "▸ Uploading…"
RESP=$(curl -sS https://upload.diawi.com/ "${UPLOAD_ARGS[@]}")
JOB=$(printf '%s' "$RESP" | python3 -c 'import sys,json
try: print(json.load(sys.stdin).get("job",""))
except Exception: print("")')

if [ -z "$JOB" ]; then
  # Surface Diawi's own message — usually a bad token or an oversized file.
  echo "✗ Diawi rejected the upload:"
  printf '  %s\n' "$RESP"
  exit 1
fi

# --- poll ---------------------------------------------------------------------
# 2000 = done, 2001 = still processing, 4000 = failed.
echo "▸ Processing (job ${JOB})…"
for _ in $(seq 1 30); do
  R=$(curl -sS "https://upload.diawi.com/status?token=${DIAWI_TOKEN}&job=${JOB}")
  ST=$(printf '%s' "$R" | python3 -c 'import sys,json
try: print(json.load(sys.stdin).get("status",""))
except Exception: print("")')
  case "$ST" in
    2000)
      LINK=$(printf '%s' "$R" | python3 -c 'import sys,json;print(json.load(sys.stdin)["link"])')
      QR=$(printf '%s' "$R"   | python3 -c 'import sys,json;print(json.load(sys.stdin).get("qrcode",""))')
      echo "✓ Install link: ${LINK}"
      [ -n "$QR" ] && echo "  QR:           ${QR}"
      # Persist it — a link lost to terminal scrollback means re-uploading.
      printf '%s  %s  %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$FILE" "$LINK" >> dist/diawi-links.txt
      echo "  (appended to dist/diawi-links.txt)"
      echo "ℹ Free-tier links expire — re-upload if teammates report a dead link."
      exit 0 ;;
    4000)
      echo "✗ Diawi processing failed:"; printf '  %s\n' "$R"; exit 1 ;;
    *) sleep 2 ;;
  esac
done

echo "… still processing after 60 s — check https://dashboard.diawi.com (job ${JOB})"
exit 1
