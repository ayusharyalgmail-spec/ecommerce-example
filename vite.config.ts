import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import path from "node:path";

// ANALYZE=1 npm run build  ->  docs/ux-overhaul/baseline/bundle-report.html (+ bundle-stats.json)
const analyze = process.env.ANALYZE === "1";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(analyze
      ? [
          visualizer({ filename: "docs/ux-overhaul/baseline/bundle-report.html", template: "treemap", gzipSize: true, brotliSize: true }),
          visualizer({ filename: "docs/ux-overhaul/baseline/bundle-stats.json", template: "raw-data", gzipSize: true, brotliSize: true }),
        ]
      : []),
  ],
  // Lazily imported overlays are pre-bundled up front. Without this the dev server discovers them mid-session,
  // re-optimizes, and can leave two copies of React loaded ("Invalid hook call").
  optimizeDeps: { include: ["@radix-ui/react-dialog", "@radix-ui/react-popover", "@radix-ui/react-tooltip", "vaul", "sonner"] },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(import.meta.dirname, "src") },
      // The real package stays reachable for the future admin live-orders module (lazy chunk only).
      { find: "realtime-real", replacement: path.resolve(import.meta.dirname, "node_modules/@supabase/realtime-js") },
      // Everything else (supabase-js) gets a stub: saves about 25 kB gzip in the entry. See src/lib/realtime-stub.ts.
      { find: /^@supabase\/realtime-js$/, replacement: path.resolve(import.meta.dirname, "src/lib/realtime-stub.ts") },
    ],
  },
  // host: true exposes the dev server on your LAN so phones can open http://<your-ip>:3001
  server: { port: 3001, host: true },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"], setupFiles: ["./src/test-setup.ts"] },
  preview: { port: 3001, host: true },
});
