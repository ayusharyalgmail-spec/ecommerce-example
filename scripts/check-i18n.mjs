// Fails when the English and Nepali dictionaries drift (PRD I18-1). Run: npm run i18n
import fs from "node:fs";

const load = (l) => JSON.parse(fs.readFileSync(new URL(`../src/messages/${l}.json`, import.meta.url), "utf8"));
const en = load("en"), ne = load("ne");
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

// Keys whose Nepali text is legitimately identical to English (brand names, codes).
const SAME_OK = new Set(["admin.sku", "common.language"]);

const errors = [];
for (const k of Object.keys(en)) {
  if (!(k in ne)) errors.push(`missing in ne.json: ${k}`);
  else if (placeholders(en[k]) !== placeholders(ne[k])) errors.push(`placeholder mismatch: ${k} (en {${placeholders(en[k])}} vs ne {${placeholders(ne[k])}})`);
}
for (const k of Object.keys(ne)) if (!(k in en)) errors.push(`missing in en.json (orphan Nepali key): ${k}`);
const warnings = Object.keys(en).filter((k) => k in ne && ne[k] === en[k] && !SAME_OK.has(k) && /[A-Za-z]{4,}/.test(en[k]));

for (const w of warnings) console.warn(`warning: ne.json value identical to English (untranslated?): ${w}`);
for (const e of errors) console.error(`error: ${e}`);
console.log(`${Object.keys(en).length} keys, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
