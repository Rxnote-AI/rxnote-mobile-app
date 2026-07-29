const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Wires a dedicated release keystore into the generated Android project.
 *
 * `expo prebuild` regenerates android/app/build.gradle from scratch every time, so
 * without this plugin a `release` build silently falls back to signing with the
 * DEBUG keystore (Expo's default template) — fine for local testing, not something
 * you'd want to hand someone as a "release" build.
 *
 * The keystore + its passwords live in the gitignored keystores/ directory (never
 * committed — see keystores/release.properties). This plugin only injects Gradle
 * code that reads that file at BUILD time; if the file is missing (e.g. a fresh
 * clone with no keystore generated yet), the release build type just falls back to
 * the debug keystore instead of failing outright.
 *
 * To regenerate the keystore from scratch:
 *   keytool -genkeypair -v -keystore keystores/release.keystore -alias rxnote-release \
 *     -keyalg RSA -keysize 2048 -validity 10950
 * then write keystores/release.properties with RELEASE_STORE_FILE / RELEASE_KEY_ALIAS /
 * RELEASE_STORE_PASSWORD / RELEASE_KEY_PASSWORD (store and key password must match —
 * modern keytool always creates PKCS12 keystores, which require them to be identical).
 */
module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes('releasePropsFile')) {
      // Already applied (e.g. a re-run without a full clean) — don't double-inject.
      return config;
    }

    contents = contents.replace(
      "def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()",
      `def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()

// Release signing — keystore + passwords live in the gitignored keystores/ directory,
// never committed. Falls back to the debug keystore if it's absent (e.g. a fresh
// clone that hasn't generated one yet), so a plain \`./gradlew assembleRelease\` never
// hard-fails; it just won't be a properly-signed release build.
def releasePropsFile = new File(projectRoot, 'keystores/release.properties')
def releaseProps = new Properties()
if (releasePropsFile.exists()) {
    releaseProps.load(new FileInputStream(releasePropsFile))
}`,
    );

    contents = contents.replace(
      `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`,
      `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (releasePropsFile.exists()) {
                storeFile new File(projectRoot, "keystores/\${releaseProps.getProperty('RELEASE_STORE_FILE')}")
                storePassword releaseProps.getProperty('RELEASE_STORE_PASSWORD')
                keyAlias releaseProps.getProperty('RELEASE_KEY_ALIAS')
                keyPassword releaseProps.getProperty('RELEASE_KEY_PASSWORD')
            }
        }
    }`,
    );

    contents = contents.replace(
      /(release\s*\{\s*\n(?:\s*\/\/[^\n]*\n)*\s*)signingConfig signingConfigs\.debug/,
      '$1signingConfig releasePropsFile.exists() ? signingConfigs.release : signingConfigs.debug',
    );

    config.modResults.contents = contents;
    return config;
  });
};
