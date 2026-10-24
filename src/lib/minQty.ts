// Client-side mirror of the quantity checks in quote_checkout (migration 20261024120000). The server is the authority;
// these only let the cart warn before checkout instead of failing there with err.MIN_QUANTITY.

/** Lowest quantity a product can be ordered in (products.min_purchase_qty). Missing or invalid values mean 1. */
export function minQty(m: number | null | undefined): number {
  return typeof m === "number" && Number.isFinite(m) && m > 1 ? Math.floor(m) : 1;
}

/** "out": cannot be bought at all (no stock, or less stock than the minimum). */
export type LineIssue = "out" | "over" | "below_min" | null;

export function lineIssue(qty: number, available: number, min: number): LineIssue {
  if (available <= 0 || min > available) return "out";
  if (qty > available) return "over";
  if (qty < min) return "below_min";
  return null;
}

/** Quantity "Fix automatically" sets a cart line to; 0 means remove the line. */
export function fixQty(qty: number, available: number, min: number): number {
  if (lineIssue(qty, available, min) === "out") return 0;
  return Math.min(Math.max(qty, min), available);
}
