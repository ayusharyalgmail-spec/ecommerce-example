/** Same-origin paths only, so ?next= cannot be used as an open redirect. */
export const safeNext = (n: string | null | undefined, fallback = "/dashboard") =>
  n && n.startsWith("/") && !n.startsWith("//") && !n.includes("\\") ? n : fallback;
