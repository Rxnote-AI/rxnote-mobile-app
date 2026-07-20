#!/usr/bin/env bash
# Build a standalone arm64 RELEASE APK (prod backend) and share it via Diawi.
#
#   ./scripts/build-android.sh              build + upload to Diawi (default)
#   ./scripts/build-android.sh --install    also adb-install to the connected device
#   ./scripts/build-android.sh --no-upload  build only, skip Diawi
#
# Notes:
#  - arm64-v8a only → ~39 MB, covers essentially all phones since ~2019.
#  - Debug-keystore signed → fine for sideloading (not Play Store).
#  - Any Android phone can install the .apk from any URL (Drive/Diawi) directly.
set -euo pipefail
cd "$(dirname "$0")/.."                          # -> apps/mobile

INSTALL=0; UPLOAD=1
for a in "$@"; do
  case "$a" in
    --install)   INSTALL=1 ;;
    --no-upload) UPLOAD=0 ;;
    *) echo "unknown flag: $a"; exit 1 ;;
  esac
done

OUT="$HOME/Desktop/RxNote-mobile.apk"

echo "▸ Setting prod env…"
npm run env:prod >/dev/null

echo "▸ Building arm64 release APK (can take ~1 min)…"
./android/gradlew -p android assembleRelease -PreactNativeArchitectures=arm64-v8a -q

APK="android/app/build/outputs/apk/release/app-release.apk"
cp "$APK" "$OUT"
echo "✓ APK: $OUT ($(du -h "$OUT" | cut -f1))"

if [ "$INSTALL" = 1 ]; then
  echo "▸ Installing to connected device…"
  adb install -r "$APK"
fi

if [ "$UPLOAD" = 1 ]; then
  echo "▸ Uploading to Diawi…"
  ./scripts/diawi-upload.sh "$OUT" "RxNote Android (prod)"
else
  echo "ℹ Skipped Diawi. Share $OUT via any link (Google Drive, etc.) — Android installs it directly."
fi
