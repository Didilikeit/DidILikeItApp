import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.didilikeitapp.app",
  appName: "Did I Like It?",
  webDir: "dist",
  server: {
    // Remove this block for production builds.
    // Keep it during development to enable live reload from your dev server:
    // url: "http://YOUR_LOCAL_IP:5173",
    // cleartext: true,
  },
  ios: {
    contentInset: "always", // respects safe areas (notch, home bar)
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
