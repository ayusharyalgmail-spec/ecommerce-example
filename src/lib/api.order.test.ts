import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("./supabase", async (orig) => ({ ...(await orig<typeof import("./supabase")>()), supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));
const { placeOrder } = await import("./api");

const input = { idempotencyKey: "k1", items: [{ productId: "p", quantity: 1 }], zoneId: "z", coupon: "", paymentMethod: "cod" as const,
  name: "Ram", phone: "9800000000", email: "", address: "Kathmandu", landmark: "", municipality: "", district: "", locale: "en" };

describe("placeOrder", () => {
  beforeEach(() => rpc.mockReset());
  it("returns the tracking token on success", async () => {
    rpc.mockResolvedValue({ data: { trackingToken: "t" }, error: null });
    expect(await placeOrder(input)).toEqual({ ok: true, token: "t" });
  });
  it("treats an idempotent replay as success, not a conflict", async () => {
    rpc.mockResolvedValue({ data: { orderNumber: "ORD-1", replayed: true }, error: null });
    expect(await placeOrder(input)).toEqual({ ok: true, replayed: true, orderNumber: "ORD-1" });
  });
  it("marks fetch failures retryable so the same key is reused", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "TypeError: Failed to fetch", code: "" } });
    expect(await placeOrder(input)).toEqual({ ok: false, code: "NETWORK", retryable: true });
  });
  it("marks definite server rejections non-retryable", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "INSUFFICIENT_STOCK: p", code: "P0001" } });
    expect(await placeOrder(input)).toEqual({ ok: false, code: "INSUFFICIENT_STOCK", retryable: false });
  });
  it("validates before calling the server", async () => {
    expect(await placeOrder({ ...input, phone: "12" })).toMatchObject({ ok: false, code: "VALIDATION_FAILED" });
    expect(rpc).not.toHaveBeenCalled();
  });
});
