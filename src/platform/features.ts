// Per-tenant feature flags (stored in tenants.features jsonb). The flagship `ecommerce` store has every feature on.
export const FEATURE_KEYS = ["coupons", "campaigns", "ledger", "messaging", "min_order_qty", "reviews", "pos_export"] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type TenantFeatures = Record<FeatureKey, boolean>;

export const ALL_FEATURES: TenantFeatures = Object.fromEntries(FEATURE_KEYS.map((k) => [k, true])) as TenantFeatures;
export const NO_FEATURES: TenantFeatures = Object.fromEntries(FEATURE_KEYS.map((k) => [k, false])) as TenantFeatures;

/** Unknown or non-boolean keys are ignored; a missing key means the feature is off (fail closed). */
export function normalizeFeatures(raw: unknown): TenantFeatures {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(FEATURE_KEYS.map((k) => [k, src[k] === true])) as TenantFeatures;
}

/** The slug of the flagship demo store: every feature on, and the offline fixture fallback. */
export const FLAGSHIP_SLUG = "ecommerce";
