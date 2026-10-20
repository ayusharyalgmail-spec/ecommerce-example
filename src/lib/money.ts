export const formatNpr = (paisa: number) =>
  `Rs. ${(paisa / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const rupeesToPaisa = (v: string | number | null | undefined) => Math.round(Number(v ?? 0) * 100);
export const paisaToRupees = (p: number) => String(p / 100);

/** Normalise Nepali mobile input to E.164 (+977XXXXXXXXXX). Null if invalid. */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/[\s\-()]/g, "");
  const m = d.match(/^(?:\+?977)?(9\d{9})$/);
  return m ? `+977${m[1]}` : null;
}
