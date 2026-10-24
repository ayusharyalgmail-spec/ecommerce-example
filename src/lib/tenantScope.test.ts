import { afterEach, describe, expect, it } from "vitest";
import { activeTenantId, setActiveTenant, tenantPath } from "./tenantScope";

afterEach(() => setActiveTenant(null));

describe("tenantScope", () => {
  it("leaves paths alone until a tenant is known (pre-migration databases keep working)", () => {
    expect(activeTenantId()).toBeNull();
    expect(tenantPath("products/p1/a.webp")).toBe("products/p1/a.webp");
  });
  it("prefixes storage paths with the tenant id once it is known", () => {
    setActiveTenant("t-123");
    expect(tenantPath("products/p1/a.webp")).toBe("t-123/products/p1/a.webp");
  });
});
