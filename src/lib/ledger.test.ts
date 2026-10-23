import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const insert = vi.fn();
vi.mock("./supabase", async (orig) => ({
  ...(await orig<typeof import("./supabase")>()),
  supabase: { rpc: (...a: unknown[]) => rpc(...a), from: () => ({ insert: (...a: unknown[]) => insert(...a) }) },
}));
const { parseAmountPaisa, paymentStatus, ledgerErrorCode, recordSale, recordPayment, addCustomer } = await import("./ledger");

const key = "11111111-1111-4111-8111-111111111111";

describe("parseAmountPaisa", () => {
  it("parses rupees with commas and decimals", () => {
    expect(parseAmountPaisa("1,250.50")).toBe(125050);
    expect(parseAmountPaisa("5000")).toBe(500000);
  });
  it("rejects zero, negatives, junk and 3 decimals", () => {
    for (const bad of ["0", "-5", "abc", "", "1.234", "1e3"]) expect(parseAmountPaisa(bad)).toBeNull();
  });
});

describe("paymentStatus", () => {
  it("splits paid / partial / credit", () => {
    expect(paymentStatus(5000, 5000)).toBe("paid");
    expect(paymentStatus(5000, 2000)).toBe("partial");
    expect(paymentStatus(5000, 0)).toBe("credit");
  });
});

describe("ledgerErrorCode", () => {
  it("maps known codes and never leaks raw SQL", () => {
    expect(ledgerErrorCode({ message: "overpayment", code: "P0001" })).toBe("overpayment");
    expect(ledgerErrorCode({ message: "permission denied for table x", code: "42501" })).toBe("forbidden");
    expect(ledgerErrorCode({ message: "duplicate key value", code: "23505" })).toBe("duplicate_phone");
    expect(ledgerErrorCode({ message: "TypeError: Failed to fetch", code: "" })).toBe("network");
    expect(ledgerErrorCode({ message: "relation does not exist", code: "42P01" })).toBe("unknown");
  });
});

describe("recordSale", () => {
  beforeEach(() => { rpc.mockReset(); });
  const base = { customerId: "c", total: "5000", paid: "2000", method: "cash" as const, billRef: "", note: "", key };
  it("sends paisa amounts and returns the server balance (Rs. 5,000 − 2,000 = 3,000)", async () => {
    rpc.mockResolvedValue({ data: { balance_paisa: 300000, duplicate: false }, error: null });
    expect(await recordSale(base)).toEqual({ ok: true, data: { balance: 300000, duplicate: false } });
    expect(rpc).toHaveBeenCalledWith("ledger_record_sale", expect.objectContaining({ p_total_paisa: 500000, p_paid_paisa: 200000, p_method: "cash", p_key: key }));
  });
  it("treats empty paid as a credit sale with no method", async () => {
    rpc.mockResolvedValue({ data: { balance_paisa: 500000, duplicate: false }, error: null });
    await recordSale({ ...base, paid: "" });
    expect(rpc).toHaveBeenCalledWith("ledger_record_sale", expect.objectContaining({ p_paid_paisa: 0, p_method: null }));
  });
  it("blocks paid > total before calling the server", async () => {
    expect(await recordSale({ ...base, paid: "6000" })).toEqual({ ok: false, code: "invalid_paid_amount" });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("recordPayment", () => {
  beforeEach(() => { rpc.mockReset(); });
  it("surfaces overpayment from the server as a safe code", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "overpayment", code: "P0001" } });
    expect(await recordPayment({ customerId: "c", amount: "9999", method: "cash", reference: "", note: "", key }))
      .toEqual({ ok: false, code: "overpayment" });
  });
  it("reuses the caller's key so a retry is a no-op server-side", async () => {
    rpc.mockResolvedValue({ data: { balance_paisa: 0, duplicate: true }, error: null });
    const r = await recordPayment({ customerId: "c", amount: "10", method: "esewa", reference: "R1", note: "", key });
    expect(r).toEqual({ ok: true, data: { balance: 0, duplicate: true } });
  });
});

describe("addCustomer", () => {
  beforeEach(() => { insert.mockReset(); });
  it("validates name and phone locally", async () => {
    expect(await addCustomer("  ", "")).toEqual({ ok: false, code: "invalid_name" });
    expect(await addCustomer("Ram", "123")).toEqual({ ok: false, code: "invalid_phone" });
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("percentChange", async () => {
  const { percentChange } = await import("./ledger");
  it("returns null without a baseline instead of a fake trend", () => {
    expect(percentChange(500, 0)).toBeNull();
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
  });
});
