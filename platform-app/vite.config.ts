import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Control-plane app: the vendor directory (/network), public vendor sites (/b/:slug) and the owner dashboard.
// It has its OWN Supabase project (platform-app/.env.local), separate from every shop. It shares only the design
// system, i18n and theme code from ../src, so the look stays one product while the data stays isolated.
const here = import.meta.dirname;
const shop = path.resolve(here, "../src");

export default defineConfig({
  root: here,
  publicDir: path.resolve(here, "../public"),
  envDir: here,
  plugins: [react(), tailwindcss()],
  resolve: {
    // Order matters: platform-owned modules first, everything else resolves into the shop's shared code.
    alias: [
      { find: /^@\/(network|business|dashboard|platform)(\/|$)/, replacement: `${here}/src/$1$2` },
      { find: "@/lib/auth", replacement: path.resolve(here, "src/auth.tsx") },
      { find: /^@supabase\/realtime-js$/, replacement: path.resolve(shop, "lib/realtime-stub.ts") },
      { find: "@", replacement: shop },
    ],
  },
  build: { outDir: path.resolve(here, "../dist-platform"), emptyOutDir: true },
  server: { port: 3002, host: true },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"], setupFiles: [path.resolve(shop, "test-setup.ts")] },
});
