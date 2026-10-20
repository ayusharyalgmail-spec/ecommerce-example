import { useEffect, useState } from "react";

// Install prompt (PWA). The browser event is captured once; the prompt is offered after an order or first add-to-cart,
// and a dismissal is remembered for 30 days. Browsers that never fire the event (iOS Safari, already installed) show nothing.
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const KEY = "install.dismissed";
const DAY = 864e5;
let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as BIPEvent; listeners.forEach((l) => l()); });
  window.addEventListener("appinstalled", () => { deferred = null; listeners.forEach((l) => l()); });
}
const dismissedRecently = () => { try { return Date.now() - Number(localStorage.getItem(KEY) ?? 0) < 30 * DAY; } catch { return false; } };

export function useInstall() {
  const [, bump] = useState(0);
  useEffect(() => { const l = () => bump((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return {
    canInstall: !!deferred && !dismissedRecently(),
    async install() { if (!deferred) return; await deferred.prompt(); const c = await deferred.userChoice; if (c.outcome === "dismissed") { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* blocked */ } } deferred = null; bump((n) => n + 1); },
    dismiss() { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* blocked */ } bump((n) => n + 1); },
  };
}
