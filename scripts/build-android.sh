#!/usr/bin/env bash
# Build a signed, standalone Android release artifact — no Metro, no dev client, no dev menu.
#
#   ./scripts/build-android.sh                  # share: slim sideload APK (default)
#   ./scripts/build-android.sh share --install  # …and install to the connected device
#   ./scripts/build-android.sh aab              # production App Bundle for Play / Firebase
#   ./scripts/build-android.sh universal        # all-ABI APK (works on emulators too)
#
# TARGETS
#   share      arm64-v8a + armeabi-v7a, native libs COMPRESSED. Smallest download, which is
#              what matters when a human sideloads from Slack/Drive. Covers every real
#              phone; will NOT run on an x86_64 emulator.
#   universal  all four ABIs, libs uncompressed. Big, but installs anywhere incl. emulators.
#   aab        App Bundle for Play / Firebase App Distribution. Both split it per-device, so
#              a tester downloads roughly a third of the universal APK. Prefer this once
#              distribution is set up — a sideloaded universal APK is the fallback.
#
# FLAGS
#   --env=prod|dev|local|lan   backend + Clerk keys (default prod)
#   --minify                   R8 + resource shrinking. Saves ~10 MB of dex, but needs a
#                              real QA pass: Reanimated/Clerk are exactly what proguard
#                              tends to break, and only your testers would see it.
#   --install                  adb install to the connected device afterwards
#   --upload                   push to Diawi and print an install link + QR
#   --no-prebuild              skip `expo prebuild` (faster; only safe if you have NOT
#                              touched app.json, plugins/, or any native dependency)
#
# WHY PREBUILD RUNS BY DEFAULT
#   android/ is gitignored and fully generated. Release signing, the nav-bar theme fix and
#   the versionCode all come from plugins/ and exist ONLY after prebuild. Skipping it
#   silently ships a stale native project — an APK missing the very fixes you just made.
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="share"
ENV_TARGET="prod"
MINIFY=0; INSTALL=0; UPLOAD=0; PREBUILD=1

for a in "$@"; do
  case "$a" in
    share|universal|aab) TARGET="$a" ;;
    --env=*)       ENV_TARGET="${a#*=}" ;;
    --minify)      MINIFY=1 ;;
    --install)     INSTALL=1 ;;
    --upload)      UPLOAD=1 ;;
    --no-prebuild) PREBUILD=0 ;;
    -h|--help)     sed -n '2,31p' "$0"; exit 0 ;;
    *) echo "✗ unknown argument: $a  (try --help)"; exit 1 ;;
  esac
done

# --- preflight -----------------------------------------------------------------
# A missing keystore is NOT a hard failure in the Gradle plugin: it quietly falls back to
# the DEBUG key, producing something that looks like a release build but can never be
# upgraded by a properly-signed one. Catch it here instead.
if [ ! -f keystores/release.properties ] || [ ! -f keystores/release.keystore ]; then
  cat >&2 <<'EOF'
✗ No release keystore in keystores/.
  Without it the build silently falls back to the DEBUG key — see the header comment in
  plugins/withAndroidReleaseSigning.js for how to regenerate one.
EOF
  exit 1
fi

command -v adb >/dev/null || { echo "✗ adb not on PATH — add \$ANDROID_HOME/platform-tools"; exit 1; }

VERSION=$(node -p "require('./app.json').expo.version")
# Monotonic and stateless. Android refuses to install over an equal-or-higher versionCode,
# so this is what lets a tester take the next build without uninstalling first.
ANDROID_VERSION_CODE="$(git rev-list --count HEAD)"
export ANDROID_VERSION_CODE
SHA=$(git rev-parse --short HEAD)
DIRTY=""; [ -n "$(git status --porcelain)" ] && DIRTY="-dirty"

echo "▸ RxNote ${VERSION} (versionCode ${ANDROID_VERSION_CODE}, ${SHA}${DIRTY})"
echo "  target=${TARGET} env=${ENV_TARGET} minify=${MINIFY}"

echo "▸ Setting ${ENV_TARGET} env…"
npm run "env:${ENV_TARGET}" >/dev/null

if [ "$PREBUILD" = 1 ]; then
  echo "▸ Regenerating native project (expo prebuild)…"
  npx expo prebuild --platform android --no-install
else
  echo "⚠ Skipping prebuild — android/ may not reflect app.json or plugins/"
fi

# --- gradle flags --------------------------------------------------------------
# Everything goes through -P so nothing has to be edited in gradle.properties, which
# prebuild regenerates anyway.
GRADLE_ARGS=()
case "$TARGET" in
  share)
    GRADLE_ARGS+=(-PreactNativeArchitectures=arm64-v8a,armeabi-v7a)
    # Uncompressed .so is the right default for Play (mmap'd straight from the APK →
    # smaller install, faster start) but a sideloaded download then pays full price.
    # Flip it only here, where download size is the thing being optimised.
    GRADLE_ARGS+=(-Pexpo.useLegacyPackaging=true)
    ;;
  universal) ;;  # template defaults: all ABIs, libs uncompressed
  aab) ;;        # Play repackages per device; never override packaging here
esac

if [ "$MINIFY" = 1 ]; then
  GRADLE_ARGS+=(-Pandroid.enableMinifyInReleaseBuilds=true)
  GRADLE_ARGS+=(-Pandroid.enableShrinkResourcesInReleaseBuilds=true)
fi

if [ "$TARGET" = "aab" ]; then
  GRADLE_TASK="bundleRelease"
  BUILT="android/app/build/outputs/bundle/release/app-release.aab"
  EXT="aab"
else
  GRADLE_TASK="assembleRelease"
  BUILT="android/app/build/outputs/apk/release/app-release.apk"
  EXT="apk"
fi

echo "▸ Gradle :app:${GRADLE_TASK} (a few minutes)…"
./android/gradlew -p android ":app:${GRADLE_TASK}" "${GRADLE_ARGS[@]}"

# --- collect ------------------------------------------------------------------
# dist/ is gitignored. The filename carries version, env and commit so a tester's
# "it's broken on my build" traces back to an exact tree.
mkdir -p dist
OUT="dist/RxNote-${VERSION}-vc${ANDROID_VERSION_CODE}-${ENV_TARGET}-${TARGET}-${SHA}${DIRTY}.${EXT}"
cp "$BUILT" "$OUT"

# --- verify -------------------------------------------------------------------
# Never hand out an artifact without confirming who signed it. A debug-signed "release" is
# the exact failure this whole setup exists to prevent.
if [ "$EXT" = "apk" ]; then
  APKSIGNER=$(ls "${ANDROID_HOME:-$HOME/Library/Android/sdk}"/build-tools/*/apksigner 2>/dev/null | sort -V | tail -1 || true)
  if [ -n "$APKSIGNER" ]; then
    DN=$("$APKSIGNER" verify --print-certs "$OUT" 2>/dev/null | grep -m1 "DN:" || true)
    case "$DN" in
      *"Android Debug"*) echo "✗ APK is DEBUG-signed — release signing did not apply."; exit 1 ;;
      "")               echo "⚠ Could not read signature (apksigner failed)" ;;
      *)                echo "✓ Signed: ${DN#*DN: }" ;;
    esac
  fi

  echo "▸ Composition (in-APK, compressed):"
  unzip -v "$OUT" | awk '
    $1 ~ /^[0-9]+$/ && NF>=8 {
      name=$NF; comp=$3
      if (name ~ /^lib\//)                            c="native libs"
      else if (name ~ /\.dex$/)                       c="dex (java/kotlin)"
      else if (name == "assets/index.android.bundle") c="JS bundle (hermes)"
      else if (name ~ /\.ttf$/)                       c="fonts"
      else                                            c="resources + other"
      C[c]+=comp; T+=comp
    }
    END { for (k in C) printf "    %-20s %6.1f MB\n", k, C[k]/1048576
          printf "    %-20s %6.1f MB\n", "TOTAL", T/1048576 }' | sort -k2 -rn
fi

echo "✓ ${OUT} ($(du -h "$OUT" | cut -f1))"
[ -n "$DIRTY" ] && echo "⚠ Built from a dirty tree — uncommitted changes are baked in."

if [ "$INSTALL" = 1 ]; then
  if [ "$EXT" = "aab" ]; then
    echo "ℹ --install skipped: an .aab can't be adb-installed (use bundletool, or build 'share')."
  else
    echo "▸ Installing…"
    # A signing-key change can't be upgraded over; surface that rather than leaving the
    # user to decode a raw INSTALL_FAILED_UPDATE_INCOMPATIBLE.
    if ! adb install -r "$OUT"; then
      echo "✗ Install failed. If that was INSTALL_FAILED_UPDATE_INCOMPATIBLE, an existing"
      echo "  build is signed with a different key: adb uninstall com.medicalrxnote.mobile"
      exit 1
    fi
  fi
fi

if [ "$UPLOAD" = 1 ]; then
  # Diawi's free tier caps around 50 MB — 'share' fits, 'universal' will not.
  echo "▸ Uploading to Diawi…"
  ./scripts/diawi-upload.sh "$OUT" "RxNote ${VERSION} (${ENV_TARGET}/${TARGET}, ${SHA})"
fi
