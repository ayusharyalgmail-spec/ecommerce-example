// Catalogue data for the v2 storefront (Phase 3). Public, RLS-protected reads only; nothing here is cached
// beyond TanStack Query memory (D-010: no private or API responses in the service worker).
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { isDemoPhoto, supabase, SUPABASE_URL } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { CARD_COLUMNS, type CardProduct } from "@/components/Product";
import { demoOn } from "./demoMode";

/** The dev-only demo catalogue, or null. In production the condition folds to false and the chunk is not built. */
export async function demo() {
  return import.meta.env.DEV && demoOn() ? await import("./demo") : null;
}

const TEN_MIN = 10 * 60_000;
const FIVE_MIN = 5 * 60_000;

export type Banner = {
  id: string; title_en: string; title_ne: string | null; subtitle_en: string | null; subtitle_ne: string | null;
  cta_label_en: string | null; cta_label_ne: string | null; link_url: string | null; image_path: string;
  image_alt_en: string | null; image_alt_ne: string | null;
};
export const BANNER_COLUMNS = "id,title_en,title_ne,subtitle_en,subtitle_ne,cta_label_en,cta_label_ne,link_url,image_path,image_alt_en,image_alt_ne";

/** Public URL of artwork in the store-assets bucket (banners/..., categories/...). */
export const assetUrl = (path?: string | null) => (!path ? null : isDemoPhoto(path) ? path : `${SUPABASE_URL}/storage/v1/object/public/store-assets/${path}`);

export function useBanners() {
  return useQuery({
    queryKey: ["banners"], staleTime: FIVE_MIN,
    queryFn: async (): Promise<Banner[]> => {
      if (await demo()) return [];
      const { data, error } = await supabase.from("banners").select(BANNER_COLUMNS).order("sort_order").limit(6);
      if (error) throw new Error(error.message);
      return (data ?? []) as Banner[];
    },
  });
}

export type CategoryArt = { id: string; slug: string; name_en: string; name_ne: string | null; image_path: string | null };
export function useCategoryArt() {
  return useQuery({
    queryKey: ["categories", "art"], staleTime: TEN_MIN,
    queryFn: async (): Promise<CategoryArt[]> => {
      const dm = await demo();
      if (dm) return dm.categories;
      const { data, error } = await supabase.from("categories").select("id,slug,name_en,name_ne,image_path").eq("is_active", true).order("sort_order");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export type Rail = "deals" | "new" | "best";
export function useRail(rail: Rail) {
  return useQuery({
    queryKey: ["rail", rail], staleTime: FIVE_MIN,
    queryFn: async (): Promise<CardProduct[]> => {
      const dm = await demo();
      if (dm) return dm.rail(rail);
      let q = supabase.from("products").select(CARD_COLUMNS).eq("status", "published");
      if (rail === "deals") q = q.not("discount_price_paisa", "is", null).order("published_at", { ascending: false });
      else if (rail === "best") q = q.gt("units_sold", 0).order("units_sold", { ascending: false });
      else q = q.order("published_at", { ascending: false });
      const { data, error } = await q.limit(10);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CardProduct[];
    },
  });
}

// ---- recently viewed and recent searches: local only, never sent anywhere ----
const read = (k: string): string[] => { try { const v = JSON.parse(localStorage.getItem(k) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; } };
const write = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };

export function recordView(productId: string) { write("rv", [productId, ...read("rv").filter((x) => x !== productId)].slice(0, 12)); }
export const recentSearches = () => read("rs");
export function recordSearch(term: string) { const t = term.trim(); if (t.length >= 2) write("rs", [t, ...read("rs").filter((x) => x !== t)].slice(0, 6)); }
export function clearSearches() { write("rs", []); }

export function useRecentlyViewed() {
  return useQuery({
    queryKey: ["recently-viewed"], staleTime: 0, gcTime: 0,
    queryFn: async (): Promise<CardProduct[]> => {
      const ids = read("rv").slice(0, 10);
      if (!ids.length) return [];
      const dm = await demo();
      if (dm) return dm.byIds(ids);
      const { data, error } = await supabase.from("products").select(CARD_COLUMNS).eq("status", "published").in("id", ids);
      if (error) throw new Error(error.message);
      const byId = new Map((data ?? []).map((p) => [(p as unknown as CardProduct).id, p as unknown as CardProduct]));
      return ids.map((i) => byId.get(i)).filter((p): p is CardProduct => !!p);
    },
  });
}

// ---- shop ----
export type ShopFilters = { q: string; category: string; sort: string; min: number | null; max: number | null; stock: boolean; sale: boolean };
export const PAGE = 12;

/** Escape characters that are special in PostgREST filters; the term is still passed as a bound value. */
const clean = (s: string) => s.trim().replace(/[%,()*\\]/g, " ").replace(/\s+/g, " ");

export async function fetchShopPage(f: ShopFilters, categoryId: string | null, page: number) {
  const dm = await demo();
  if (dm) return dm.shopPage(f, categoryId, page, PAGE);
  let q = supabase.from("products").select(CARD_COLUMNS, { count: "exact" }).eq("status", "published");
  if (categoryId) q = q.eq("category_id", categoryId);
  const term = clean(f.q);
  if (term.length >= 2) q = q.or(`name_en.ilike.%${term}%,name_ne.ilike.%${term}%,description_en.ilike.%${term}%,description_ne.ilike.%${term}%`);
  if (f.min != null) q = q.gte("price_paisa", Math.round(f.min * 100));
  if (f.max != null) q = q.lte("price_paisa", Math.round(f.max * 100));
  if (f.sale) q = q.not("discount_price_paisa", "is", null);
  if (f.stock) q = q.gt("stock_quantity", 0);
  q = f.sort === "price_asc" ? q.order("price_paisa") : f.sort === "price_desc" ? q.order("price_paisa", { ascending: false })
    : f.sort === "best" ? q.order("units_sold", { ascending: false }) : f.sort === "name" ? q.order("name_en")
    : q.order("published_at", { ascending: false });
  const { data, count, error } = await q.range((page - 1) * PAGE, page * PAGE - 1);
  if (error) throw new Error(error.message);
  return { products: (data ?? []) as unknown as CardProduct[], count: count ?? 0 };
}

export function useShopPages(f: ShopFilters, categoryId: string | null, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["shop", f, categoryId], enabled, staleTime: 60_000, initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchShopPage(f, categoryId, pageParam),
    getNextPageParam: (last, all) => (all.length * PAGE < last.count ? all.length + 1 : undefined),
  });
}

export function useShopPage(f: ShopFilters, categoryId: string | null, page: number, enabled: boolean) {
  return useQuery({
    queryKey: ["shop-page", f, categoryId, page], enabled, staleTime: 60_000,
    queryFn: () => fetchShopPage(f, categoryId, page),
    placeholderData: (prev) => prev,
  });
}

/** Top product names for the search overlay. Debounced by the caller; minimum 2 characters. */
export function useSuggestions(term: string) {
  const t = clean(term);
  return useQuery({
    queryKey: ["suggest", t], enabled: t.length >= 2, staleTime: 60_000,
    queryFn: async (): Promise<{ slug: string; name_en: string; name_ne: string | null }[]> => {
      const dm = await demo();
      if (dm) return dm.suggest(t);
      const { data, error } = await supabase.from("products").select("slug,name_en,name_ne").eq("status", "published")
        .or(`name_en.ilike.%${t}%,name_ne.ilike.%${t}%`).limit(6);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

/** Product ids the signed-in customer has saved, shared by every card so hearts show the real state. */
export function useWishIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wish-ids", user?.id ?? null], enabled: !!user && !(import.meta.env.DEV && demoOn()), staleTime: 60_000,
    queryFn: async (): Promise<Set<string>> => {
      const { data } = await supabase.from("wishlists").select("product_id").eq("user_id", user!.id);
      return new Set((data ?? []).map((r) => r.product_id as string));
    },
  });
}
