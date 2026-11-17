import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The iOS app bundles the statically generated frontend (`pnpm generate:ios`) and talks to a Mealie
 * server the user picks on first launch. See docs/docs/contributors/developers-guide/ios-app.md.
 */
const config: CapacitorConfig = {
  // Must match the bundle ID registered in the Apple Developer portal
  appId: "io.github.theshield2594.mealie",
  appName: "Mealie",
  webDir: ".output/public",
  ios: {
    // Lets the page reach under the notch and home indicator; the layout already pads for the
    // safe area through viewport-fit=cover
    contentInset: "never",
    scheme: "Mealie",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
    },
  },
};

export default config;
