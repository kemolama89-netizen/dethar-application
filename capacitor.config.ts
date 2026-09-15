import type { CapacitorConfig } from "@capacitor/cli";

// Native shell config for the Android build only (Phase 2 of the Floating
// Tasbeeh feature — see the feature plan). `appId` is a placeholder bundle
// id, not yet confirmed for a real Play Store listing; change it before any
// real release build. The web app itself (this repo's actual product,
// deployed to GitHub Pages) is completely unaffected by this file — Vite's
// build/dev scripts don't read it at all.
const config: CapacitorConfig = {
  appId: "com.dithar.app",
  appName: "DITHAR",
  webDir: "dist",
};

export default config;
