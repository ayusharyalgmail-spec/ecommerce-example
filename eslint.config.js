import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import fs from "node:fs";

// Files that still use legacy classes or `!` utilities (frozen on 20 Oct 2026, see docs/ux-overhaul/baseline).
// The list only ever shrinks: migrating a page means removing it from this file. New files are never added.
const legacyAllow = JSON.parse(fs.readFileSync(new URL("./eslint.legacy-allowlist.json", import.meta.url), "utf8"));

const LEGACY = "(^|\\s)(btn|btn-primary|btn-secondary|btn-danger|card|badge|badge-ok|badge-warn|badge-err|badge-info|alert|field|container-page|muted)(\\s|$)";
const BANG = "(^|\\s)![a-z]";

const classHygiene = [
  { selector: `JSXAttribute[name.name='className'] Literal[value=/${BANG}/]`, message: "No `!` important utilities. Use a variant in src/ui instead (DESIGN.md section 8)." },
  { selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=/${BANG}/]`, message: "No `!` important utilities. Use a variant in src/ui instead." },
  { selector: `JSXAttribute[name.name='className'] Literal[value=/${LEGACY}/]`, message: "Legacy class (.btn/.card/.badge/.alert/.field/.muted/.container-page). Use the src/ui primitives or token utilities." },
  { selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=/${LEGACY}/]`, message: "Legacy class. Use the src/ui primitives or token utilities." },
];

export default tseslint.config(
  { ignores: ["dist", "node_modules", "docs", "files (9)", "server", "scripts", "public"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Icons come only from src/ui/icons.ts so the set stays tree-shaken and consistent.
      "no-restricted-imports": ["error", { paths: [{ name: "lucide-react", message: "Import icons from '@/ui' (src/ui/icons.ts)." }] }],
      "no-restricted-syntax": ["error", ...classHygiene],
    },
  },
  // Layering: ui/ is the lowest layer and may not import pages, components or features.
  {
    files: ["src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{ name: "lucide-react", message: "Import icons from src/ui/icons.ts only." }],
        patterns: [{ group: ["@/pages/*", "@/components/*", "@/features/*"], message: "src/ui must not import from higher layers (ARCHITECTURE.md section 3)." }],
      }],
    },
  },
  // The single place allowed to import lucide-react.
  { files: ["src/ui/icons.ts"], rules: { "no-restricted-imports": "off" } },
  // Frozen legacy files keep their old classes until they migrate.
  { files: legacyAllow, rules: { "no-restricted-syntax": "off" } },
  { files: ["*.js", "*.mjs", "vite.config.ts"], languageOptions: { globals: globals.node } },
  { files: ["src/**/*.test.{ts,tsx}"], rules: { "no-restricted-syntax": "off" } },
);
