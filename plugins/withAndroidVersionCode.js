const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Sets `versionCode` from the ANDROID_VERSION_CODE env var at prebuild time.
 *
 * Why a plugin: `expo prebuild` regenerates android/app/build.gradle with a hardcoded
 * `versionCode 1` (app.json declares no android.versionCode), and android/ is gitignored,
 * so there is nowhere durable to edit it by hand. Gradle can't read it from a -P flag
 * either, because the generated build.gradle hardcodes the literal.
 *
 * Android refuses to install an APK over one with an equal-or-higher versionCode, which
 * is the usual "why won't the new build install over the old one" report from testers.
 * scripts/build-android.sh derives the value from `git rev-list --count HEAD` — monotonic,
 * requires no state, and maps a tester's build back to an exact commit.
 *
 * Unset env var → left at whatever the template generated. Only meaningful during
 * prebuild; running gradle alone reuses the last generated value.
 */
module.exports = function withAndroidVersionCode(config) {
  return withAppBuildGradle(config, (config) => {
    const raw = process.env.ANDROID_VERSION_CODE;
    if (!raw) return config;

    const versionCode = Number.parseInt(raw, 10);
    if (!Number.isInteger(versionCode) || versionCode < 1) {
      throw new Error(
        `withAndroidVersionCode: ANDROID_VERSION_CODE must be a positive integer, got "${raw}"`,
      );
    }

    config.modResults.contents = config.modResults.contents.replace(
      /versionCode \d+/,
      `versionCode ${versionCode}`,
    );

    return config;
  });
};
