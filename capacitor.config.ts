import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pelonaroupa.app",
  appName: "PeloNaRoupa",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
    // NOTE: server.url removed — Capacitor now serves assets locally from dist/public.
    // For local development hot-reload, temporarily add:
    //   url: "http://<your-local-ip>:5173",
    //   cleartext: true,
  },
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
    },
  },
};

export default config;
