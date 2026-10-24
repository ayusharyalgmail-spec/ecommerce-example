import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = { productId: string; quantity: number };
type CartCtx = {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const BASE_KEY = "cart.v1";
const Ctx = createContext<CartCtx | null>(null);

function load(KEY: string): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { items: CartItem[]; at: number };
    // Carts persist for a week (CART-004).
    return Date.now() - parsed.at < 7 * 864e5 ? parsed.items : [];
  } catch { return []; }
}

/** `scope` (the tenant slug) keeps one cart per store; the flagship keeps the original key so existing carts survive. */
export function CartProvider({ children, scope }: { children: React.ReactNode; scope?: string | null }) {
  const KEY = scope && scope !== "ecommerce" ? `${BASE_KEY}:${scope}` : BASE_KEY;
  const [items, setItems] = useState<CartItem[]>(() => load(KEY));

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ items, at: Date.now() })); } catch { /* private mode */ }
  }, [items, KEY]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setItems(load(KEY)); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [KEY]);

  const add = useCallback((productId: string, qty = 1) =>
    setItems((cur) => {
      const found = cur.find((i) => i.productId === productId);
      if (found) return cur.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(99, i.quantity + qty) } : i));
      return [...cur, { productId, quantity: Math.min(99, qty) }];
    }), []);
  const setQty = useCallback((productId: string, qty: number) =>
    setItems((cur) => (qty <= 0 ? cur.filter((i) => i.productId !== productId) : cur.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(99, qty) } : i)))), []);
  const remove = useCallback((productId: string) => setItems((cur) => cur.filter((i) => i.productId !== productId)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, ready: true, count: items.reduce((n, i) => n + i.quantity, 0), add, setQty, remove, clear }),
    [items, add, setQty, remove, clear]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
