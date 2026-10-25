import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rpc = vi.fn();
vi.mock("@/lib/supabase", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) }, SUPABASE_URL: "http://x" }));

import { TenantProvider, useTenant } from "./TenantContext";

function Probe() {
  const t = useTenant();
  return <p data-testid="p">{[t.mode, t.slug, t.tenantId, t.isFallback, t.hasFeature("coupons"), t.hasFeature("ledger"), t.error?.message ?? ""].join("|")}</p>;
}
const show = (ref: Parameters<typeof TenantProvider>[0]["tenantRef"]) =>
  render(<QueryClientProvider client={new QueryClient()}><TenantProvider tenantRef={ref}><Probe /></TenantProvider></QueryClientProvider>);

afterEach(cleanup);

describe("TenantProvider", () => {
  it("hub has no tenant and no features", () => {
    show({ kind: "hub" });
    expect(screen.getByTestId("p").textContent).toBe("hub|||false|false|false|");
  });
  it("flagship falls back (all features on) when the database has no row", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });
    show({ kind: "slug", slug: "ecommerce", via: "query" });
    await waitFor(() => expect(screen.getByTestId("p").textContent).toBe("store|ecommerce||true|true|true|"));
  });
  it("a vendor gets only its own features and its database id", async () => {
    rpc.mockResolvedValueOnce({ data: { id: "t-1", slug: "family-mart", features: { coupons: true, ledger: false, bogus: true } }, error: null });
    show({ kind: "slug", slug: "family-mart", via: "query" });
    await waitFor(() => expect(screen.getByTestId("p").textContent).toBe("store|family-mart|t-1|false|true|false|"));
  });
  it("an unknown vendor is an error, never a fallback", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });
    show({ kind: "slug", slug: "nope-store", via: "query" });
    await waitFor(() => expect(screen.getByTestId("p").textContent).toContain("TENANT_NOT_FOUND"));
  });
  it("vendor store resolved via subdomain loads tenant record", async () => {
    rpc.mockResolvedValueOnce({ data: { id: "t-myshop", slug: "myshop", features: { coupons: true } }, error: null });
    show({ kind: "slug", slug: "myshop", via: "subdomain" });
    await waitFor(() => expect(screen.getByTestId("p").textContent).toBe("store|myshop|t-myshop|false|true|false|"));
  });
});
