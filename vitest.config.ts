import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { defineConfig } from "vitest/config";

const templateRoot = path.resolve(import.meta.dirname);

// Load env files in priority order (later files override earlier ones)
// .env.local → .env.production.local → .env.test
for (const envFile of [".env.local", ".env.production.local", ".env.test"]) {
  const envPath = path.resolve(templateRoot, envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  }
}

// Expose VITE_ prefixed vars to the test environment
// (Vite strips these in production but tests run in Node)
if (process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL;
}
if (process.env.SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
}

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    env: {
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_ANON_KEY: "",
    },
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.test.tsx",
    ],
  },
});
