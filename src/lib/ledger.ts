// Shop ledger client (Phase 1). All balances and totals come from the database; this file only
// validates input before the call and maps database error codes to translated messages.
import { supabase } from "./supabase";
import { normalizePhone, rupeesToPaisa } from "./money";
import { randomUUID } from "./uuid";

export type PayMethod = "cash" | "bank" | "esewa" | "khalti" | "other";
export const PAY_METHODS: PayMethod[] = ["cash", "bank", "esewa", "khalti", "other"];

export type CustomerBalance = {
  id: string; name: string; phone: string | null; is_archived: boolean;
  balance_paisa: number; last_activity: string | null; last_payment: string | null;
};
export type LedgerEntry = {
  id: string; kind: "sale" | "payment" | "refund" | "adjustment"; delta_paisa: number;
  method: PayMethod | null; reference: string | null; note: string | null; bill_ref: string | null; created_at: string;
};
export type DailySummary = {
  day: string; sales_paisa: number; collected_paisa: number; cash_collected_paisa: number;
  refunds_paisa: number; sale_count: number; net_credit_change_paisa: number; total_dues_paisa: number;
};

export type LedgerErrorCode =
  | "forbidden" | "invalid_amount" | "invalid_paid_amount" | "method_required" | "overpayment"
  | "customer_not_found" | "customer_archived" | "reason_required" | "duplicate_phone" | "invalid_phone"
  | "invalid_name" | "network" | "unknown";

/** Maps a Postgres/PostgREST error to a stable code. Raw SQL text is never shown to users. */
export function ledgerErrorCode(e: { message?: string; code?: string } | null): LedgerErrorCode {
  if (!e) return "unknown";
  const m = e.message ?? "";
  if (e.code === "23505") return "duplicate_phone";
  const known = ["forbidden", "invalid_amount", "invalid_paid_amount", "method_required", "overpayment",
    "customer_not_found", "customer_archived", "reason_required"] as const;
  for (const k of known) if (m.includes(k)) return k;
  if (e.code === "42501") return "forbidden";
  if (!e.code && /fetch|network|failed/i.test(m)) return "network";
  return "unknown";
}

export type Result<T = void> = { ok: true; data: T } | { ok: false; code: LedgerErrorCode };
const fail = (code: LedgerErrorCode): { ok: false; code: LedgerErrorCode } => ({ ok: false, code });

/** Parses a rupee input ("1,250.50") into positive integer paisa, or null. */
export function parseAmountPaisa(raw: string): number | null {
  const s = raw.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const p = rupeesToPaisa(s);
  return p > 0 ? p : null;
}

/** Plain-language status for a sale: what the shopkeeper sees at checkout (item 32). */
export function paymentStatus(total: number, paid: number): "paid" | "partial" | "credit" {
  if (paid >= total) return "paid";
  return paid > 0 ? "partial" : "credit";
}

export type SaleInput = { customerId: string; total: string; paid: string; method: PayMethod; billRef: string; note: string; key: string };

export async function recordSale(i: SaleInput): Promise<Result<{ balance: number; duplicate: boolean }>> {
  const total = parseAmountPaisa(i.total);
  if (!total) return fail("invalid_amount");
  const paid = i.paid.trim() === "" ? 0 : parseAmountPaisa(i.paid);
  if (paid === null || paid > total) return fail("invalid_paid_amount");
  const { data, error } = await supabase.rpc("ledger_record_sale", {
    p_customer: i.customerId, p_total_paisa: total, p_paid_paisa: paid, p_method: paid > 0 ? i.method : null,
    p_bill_ref: i.billRef.trim() || null, p_note: i.note.trim() || null, p_key: i.key,
  });
  if (error) return fail(ledgerErrorCode(error));
  const r = data as { balance_paisa: number; duplicate: boolean };
  return { ok: true, data: { balance: r.balance_paisa, duplicate: r.duplicate } };
}

export type PaymentInput = { customerId: string; amount: string; method: PayMethod; reference: string; note: string; key: string };

export async function recordPayment(i: PaymentInput): Promise<Result<{ balance: number; duplicate: boolean }>> {
  const amount = parseAmountPaisa(i.amount);
  if (!amount) return fail("invalid_amount");
  const { data, error } = await supabase.rpc("ledger_record_payment", {
    p_customer: i.customerId, p_amount_paisa: amount, p_method: i.method,
    p_reference: i.reference.trim() || null, p_note: i.note.trim() || null, p_key: i.key,
  });
  if (error) return fail(ledgerErrorCode(error));
  const r = data as { balance_paisa: number; duplicate: boolean };
  return { ok: true, data: { balance: r.balance_paisa, duplicate: r.duplicate } };
}

export async function addCustomer(name: string, phone: string): Promise<Result<string>> {
  if (name.trim().length < 1) return fail("invalid_name");
  const p = phone.trim() ? normalizePhone(phone) : null;
  if (phone.trim() && !p) return fail("invalid_phone");
  const { data, error } = await supabase.from("ledger_customers").insert({ name: name.trim(), phone: p }).select("id").single();
  if (error) return fail(ledgerErrorCode(error));
  return { ok: true, data: (data as { id: string }).id };
}

export const newLedgerKey = randomUUID;

export async function listBalances(): Promise<CustomerBalance[]> {
  const { data, error } = await supabase.from("ledger_customer_balances").select("*").eq("is_archived", false).order("balance_paisa", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomerBalance[];
}

export async function customerStatement(customerId: string): Promise<LedgerEntry[]> {
  const { data, error } = await supabase.from("ledger_entries")
    .select("id,kind,delta_paisa,method,reference,note,bill_ref,created_at").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as LedgerEntry[];
}

export async function dailySummary(): Promise<DailySummary> {
  const { data, error } = await supabase.rpc("ledger_daily_summary", { p_day: null });
  if (error) throw new Error(error.message);
  return data as DailySummary;
}

export type SeriesPoint = { day: string; sales_paisa: number; collected_paisa: number };

export async function dailySeries(days = 14): Promise<SeriesPoint[]> {
  const { data, error } = await supabase.rpc("ledger_daily_series", { p_days: days });
  if (error) throw new Error(error.message);
  return (data ?? []) as SeriesPoint[];
}

/** Change vs the previous value as a whole-number percent, or null when there is no baseline (never invent a trend). */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
