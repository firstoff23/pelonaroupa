import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const plugins = [
  react(),
  tailwindcss(),
  VitePWA({
    registerType: "autoUpdate",
    injectRegister: "auto",
    strategies: "injectManifest",
    srcDir: "src",
    filename: "sw.ts",
    injectManifest: {
      globPatterns: [
        "index.html",
        "manifest.webmanifest",
        "assets/index-*.{js,css}",
        "assets/vendor-react-*.js",
        "icons/*.png",
        "icon.svg",
        "qr-code.svg",
      ],
      maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
    },
    manifest: {
      name: "AnimalMind",
      short_name: "AnimalMind",
      description: "AnimalMind: Monitorização inteligente do bem-estar animal",
      theme_color: "#22c55e",
      background_color: "#0a0a0b",
      display: "standalone",
      start_url: "/",
      icons: [
        {
          src: "/icons/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icons/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/icons/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    },
  }),
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": [
            "react",
            "react-dom",
            "@tanstack/react-query",
            "@trpc/client",
            "@trpc/react-query",
          ],
          "vendor-charts": ["recharts"],
          "vendor-export": ["jspdf"],
          "vendor-markdown": ["streamdown"],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
