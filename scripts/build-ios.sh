#!/usr/bin/env bash
# Build an ad-hoc iOS .ipa on EAS (prod backend) and share it via Diawi.
#
#   ./scripts/build-ios.sh              build + upload to Diawi (default)
#   ./scripts/build-ios.sh --no-upload  build only (print EAS install page)
#
# One-time prereqs (already done in this project):
#  - eas login                              (Expo account: razuyadav93)
#  - eas device:create → open the link ON each iPhone to register its UDID
#  - first `eas build` created the signing cert + ad-hoc provisioning profile
#
# IMPORTANT:
#  - Run from apps/mobile (this script cd's there). NEVER run eas from the repo root.
#  - An ad-hoc build installs ONLY on devices registered BEFORE the build.
#    Added a new tester? Have them open the register-device link, then re-run this.
#  - iOS can install straight from the EAS build page (Install button) OR Diawi;
#    a raw .ipa URL will NOT install (iOS needs an OTA manifest, which both provide).
set -euo pipefail
cd "$(dirname "$0")/.."                          # -> apps/mobile
set -a; [ -f .env.local ] && . ./.env.local; set +a

APPLE_TEAM_ID="${APPLE_TEAM_ID:-NAUVFJNG6R}"     # RAJU YADAV (Individual)
EAS_ACCOUNT="${EAS_ACCOUNT:-razuyadav93}"
UPLOAD=1; [ "${1:-}" = "--no-upload" ] && UPLOAD=0
[ "${1:-}" != "" ] && [ "${1:-}" != "--no-upload" ] && { echo "unknown flag: $1"; exit 1; }

OUT="$HOME/Desktop/RxNote-mobile.ipa"
EAS="npx eas-cli@latest"

echo "▸ Registered devices (ad-hoc build installs ONLY on these):"
$EAS device:list --apple-team-id "$APPLE_TEAM_ID" --non-interactive || true

echo "▸ Submitting ad-hoc build…"
SUB=$($EAS build -p ios --profile preview --non-interactive --no-wait --json 2>/dev/null || true)
ID=$(printf '%s' "$SUB" | python3 -c "import sys,json
try:
  d=json.load(sys.stdin); d=d[0] if isinstance(d,list) else d; print(d.get('id',''))
except Exception: print('')" 2>/dev/null)
if [ -z "$ID" ]; then
  echo "✗ Could not submit. If EAS needs credentials, run ONCE interactively then retry:"
  echo "    npx eas-cli build -p ios --profile preview"
  exit 1
fi
BUILD_PAGE="https://expo.dev/accounts/$EAS_ACCOUNT/projects/rxnote-mobile/builds/$ID"
echo "  build id:  $ID"
echo "  logs/page: $BUILD_PAGE"

echo "▸ Waiting for build (≈15–30 min)…"
while true; do
  S=$($EAS build:view "$ID" --json 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")
  case "$S" in
    FINISHED) echo "  ✓ finished"; break ;;
    ERRORED|CANCELED) echo "  ✗ build $S — see $BUILD_PAGE"; exit 1 ;;
    *) printf '  … %s\n' "${S:-checking}"; sleep 30 ;;
  esac
done

URL=$($EAS build:view "$ID" --json 2>/dev/null | python3 -c "import sys,json;print((json.load(sys.stdin).get('artifacts') or {}).get('applicationArchiveUrl') or '')")
echo "▸ Downloading .ipa…"
curl -sL "$URL" -o "$OUT"
echo "✓ IPA: $OUT ($(du -h "$OUT" | cut -f1))"
echo "ℹ Testers can also install from the EAS page (Install button): $BUILD_PAGE"

if [ "$UPLOAD" = 1 ]; then
  echo "▸ Uploading to Diawi…"
  ./scripts/diawi-upload.sh "$OUT" "RxNote iOS ad-hoc (prod)"
fi
