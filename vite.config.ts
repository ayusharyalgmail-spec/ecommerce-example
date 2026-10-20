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
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // host: true exposes the dev server on your LAN so phones can open http://<your-ip>:3001
  server: { port: 3001, host: true },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
  preview: { port: 3001, host: true },
});
