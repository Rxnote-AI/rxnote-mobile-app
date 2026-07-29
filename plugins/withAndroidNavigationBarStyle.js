const { withAndroidStyles, AndroidConfig } = require('@expo/config-plugins');

/**
 * Makes the Android system navigation bar blend into the app's white bottom surface.
 *
 * Two separate problems this works around:
 *
 * 1. `androidNavigationBar` in app.json is a NO-OP on SDK 57. `@expo/prebuild-config`
 *    has no handler for that key any more, so `barStyle: 'dark-content'` +
 *    `backgroundColor: '#FFFFFF'` never reach the generated theme. The block is kept in
 *    app.json only because iOS/other tooling may read it — do not trust it on Android.
 *
 * 2. Even if it did apply, `android:navigationBarColor` is ignored under edge-to-edge
 *    (forced for targetSdk 35+ on Android 15+). Instead the platform paints its own
 *    translucent "contrast" scrim behind the 3-button nav bar so that light app content
 *    stays distinguishable from the buttons. On this app that scrim rendered as a solid
 *    grey strip (#8B8D91) below the white tab bar, with light-on-dark nav icons.
 *
 * So: opt out of the scrim, and ask for dark nav icons since the bar now sits over the
 * tab bar's own white. The tab bar already pads itself by `insets.bottom`
 * (see `src/app/(clinician)/_layout.tsx`), so the app genuinely draws white behind the
 * bar — there is nothing else for the system to composite against.
 *
 * Gesture-nav devices never showed this: the scrim only applies to the 3-button bar.
 */
module.exports = function withAndroidNavigationBarStyle(config) {
  return withAndroidStyles(config, (config) => {
    const parent = AndroidConfig.Styles.getAppThemeGroup();

    // Kill the platform contrast scrim so the app's white shows through. API 29+.
    config.modResults = AndroidConfig.Styles.assignStylesValue(config.modResults, {
      add: true,
      parent,
      name: 'android:enforceNavigationBarContrast',
      value: 'false',
      targetApi: 'q',
    });

    // Dark back/home/recents icons, now that they sit on white. API 27+.
    config.modResults = AndroidConfig.Styles.assignStylesValue(config.modResults, {
      add: true,
      parent,
      name: 'android:windowLightNavigationBar',
      value: 'true',
      targetApi: '27',
    });

    return config;
  });
};
