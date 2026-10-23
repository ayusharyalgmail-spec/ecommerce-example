export type ShareResult = "shared" | "copied" | "cancelled" | "failed";
type ShareData = { title: string; text: string; url: string };

/** True on Android/iOS where navigator.share opens the full OS share sheet. */
export function isNativeShareDevice(): boolean {
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent) && typeof navigator.share === "function";
}

/** Native share sheet where supported (Android Chrome, Safari); otherwise copy the link. A user closing the sheet
 * is "cancelled", not an error. Other share failures (e.g. NotAllowedError outside a tap) fall back to copying. */
export async function shareLink(data: ShareData, nav: Navigator = navigator): Promise<ShareResult> {
  if (typeof nav.share === "function" && (!nav.canShare || nav.canShare(data))) {
    try { await nav.share(data); return "shared"; }
    catch (e) { if ((e as { name?: string })?.name === "AbortError") return "cancelled"; }
  }
  return (await copyText(data.url, nav)) ? "copied" : "failed";
}

export async function copyText(text: string, nav: Navigator = navigator): Promise<boolean> {
  try { if (nav.clipboard?.writeText) { await nav.clipboard.writeText(text); return true; } } catch { /* fall through */ }
  try {
    // Older WebViews: no async clipboard, but execCommand still works inside a user gesture.
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch { return false; }
}
