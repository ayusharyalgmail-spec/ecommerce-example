// Read-only adapters that answer the storefront's catalogue queries from the demo fixture (dev only).
// Shapes match the Supabase queries in ../data.ts so the UI code path is identical.
import type { CardProduct } from "@/components/Product";
import type { CartLine } from "@/lib/api";
import type { CategoryArt, Rail, ShopFilters } from "../data";
import { DEMO_CATEGORIES, DEMO_ROWS } from "./fixture";
import { DEMO_IMAGES, type DemoImage } from "./images";

// Each category tile borrows one representative product photo.
const CATEGORY_PHOTO: Record<string, string> = {
  "general-store": "basmati-rice-5kg",
  shoes: "air-running-shoes",
  clothes: "classic-cotton-tshirt",
  electronics: "wireless-anc-headphones",
  groceries: "potatoes-1kg",
  snacks: "potato-chips-family",
  beverages: "orange-juice-1l",
  household: "toilet-tissue-pack",
  "personal-care": "toothbrush",
  stationery: "pencil-pack",
  books: "sample-novel",
  kitchen: "pressure-cooker-3l",
  "home-lifestyle": "led-bulb-9w",
};
export const heroPhoto: DemoImage | null = DEMO_IMAGES.hero ?? null;
export const promoPhoto: DemoImage | null = DEMO_IMAGES.promo ?? null;

// Stable, valid UUIDs so ids survive reloads and never collide with real rows (the server would simply not find them).
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const DAY = 864e5;
const NOW = Date.parse("2026-10-20T08:00:00Z");

export type DemoProduct = CardProduct & {
  category_id: string; description_en: string; description_ne: null; units_sold: number; published_at: string;
};

export const categories: CategoryArt[] = DEMO_CATEGORIES.map((c, i) => ({ id: uuid(1000 + i), slug: c.slug, name_en: c.name_en, name_ne: c.name_ne, image_path: DEMO_IMAGES[CATEGORY_PHOTO[c.slug]]?.src ?? null }));
const catId = new Map(categories.map((c) => [c.slug, c.id]));

let n = 0;
export const products: DemoProduct[] = Object.entries(DEMO_ROWS).flatMap(([cat, rows]) =>
  rows.map(([slug, name, price, sale, stock, sold, age, desc]) => ({
    id: uuid(++n), slug: `demo-${slug}`, name_en: name, name_ne: null,
    price_paisa: price * 100, discount_price_paisa: sale != null && sale < price ? sale * 100 : null,
    discount_label_en: null, discount_label_ne: null,
    stock_quantity: stock, reserved_quantity: 0, low_stock_threshold: 8,
    rating_sum: 0, review_count: 0,
    product_images: DEMO_IMAGES[slug] ? [{ storage_path: DEMO_IMAGES[slug].src, is_primary: true, sort_order: 0 }] : [],
    category_id: catId.get(cat)!, description_en: desc, description_ne: null,
    units_sold: sold, published_at: new Date(NOW - age * DAY).toISOString(),
  })));

const bySlug = new Map(products.map((p) => [p.slug, p]));
const byId = new Map(products.map((p) => [p.id, p]));
const newest = (a: DemoProduct, b: DemoProduct) => b.published_at.localeCompare(a.published_at);

export function rail(r: Rail): CardProduct[] {
  if (r === "deals") return products.filter((p) => p.discount_price_paisa != null).sort(newest).slice(0, 10);
  if (r === "best") return [...products].sort((a, b) => b.units_sold - a.units_sold).slice(0, 10);
  return [...products].sort(newest).slice(0, 10);
}

export function shopPage(f: ShopFilters, categoryId: string | null, page: number, size: number) {
  const term = f.q.trim().toLowerCase();
  const catNames = new Map(categories.map((c) => [c.id, `${c.name_en} ${c.name_ne}`.toLowerCase()]));
  let list = products.filter((p) =>
    (!categoryId || p.category_id === categoryId) &&
    (term.length < 2 || `${p.name_en} ${p.description_en} ${catNames.get(p.category_id)}`.toLowerCase().includes(term)) &&
    (f.min == null || p.price_paisa >= f.min * 100) &&
    (f.max == null || p.price_paisa <= f.max * 100) &&
    (!f.sale || p.discount_price_paisa != null) &&
    (!f.stock || p.stock_quantity - p.reserved_quantity > 0));
  list = [...list].sort(
    // Same as the server: price sorts and filters use the list price (price_paisa).
    f.sort === "price_asc" ? (a, b) => a.price_paisa - b.price_paisa
      : f.sort === "price_desc" ? (a, b) => b.price_paisa - a.price_paisa
      : f.sort === "name" ? (a, b) => a.name_en.localeCompare(b.name_en)
      : f.sort === "best" ? (a, b) => b.units_sold - a.units_sold
      : newest);
  return { products: list.slice((page - 1) * size, page * size) as CardProduct[], count: list.length };
}

export function suggest(term: string) {
  const t = term.toLowerCase();
  return products.filter((p) => p.name_en.toLowerCase().includes(t)).slice(0, 6).map((p) => ({ slug: p.slug, name_en: p.name_en, name_ne: p.name_ne }));
}

export const byIds = (ids: string[]) => ids.map((i) => byId.get(i)).filter((p): p is DemoProduct => !!p);

export function cartLines(ids: string[]): CartLine[] {
  return byIds(ids).map((p) => ({ id: p.id, slug: p.slug, category_id: p.category_id, name_en: p.name_en, name_ne: p.name_ne, price_paisa: p.price_paisa,
    discount_price_paisa: p.discount_price_paisa, available: p.stock_quantity - p.reserved_quantity, image: p.product_images?.[0]?.storage_path ?? null, min_qty: 1 }));
}

/** Same shape as the product page query; demo products have no photos and no reviews. */
export function productPage(slug: string) {
  const p = bySlug.get(slug);
  if (!p) return null;
  const related = products.filter((x) => x.category_id === p.category_id && x.id !== p.id).slice(0, 4);
  const photo = DEMO_IMAGES[p.slug.replace(/^demo-/, "")];
  const product_images = photo ? [{ id: p.id, storage_path: photo.src, alt_en: p.name_en, alt_ne: null, is_primary: true, sort_order: 0, width: photo.w, height: photo.h, blur_color: null }] : [];
  return { p: { ...p, product_images }, reviews: [], dist: [0, 0, 0, 0, 0], related: related as CardProduct[], wa: null, wished: false,
    credit: photo ? { author: photo.author, license: photo.license, page: photo.page } : null };
}
