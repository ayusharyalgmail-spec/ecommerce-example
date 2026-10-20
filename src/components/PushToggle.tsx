import { useEffect, useState } from "react";
import { Bell, BellOff } from "@/ui";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

const b64ToU8 = (s: string) => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

type State = "unsupported" | "off" | "on" | "denied" | "busy";
const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** Opt-in to Web Push. `orderToken` lets a guest subscribe for a single order. */
export default function PushToggle({ orderToken }: { orderToken?: string }) {
  const { t, locale } = useT();
  const [state, setState] = useState<State>(() => (supported() ? (Notification.permission === "denied" ? "denied" : "off") : "unsupported"));

  useEffect(() => {
    if (!supported() || Notification.permission === "denied") return;
    navigator.serviceWorker.getRegistration("/sw.js").then((r) => r?.pushManager.getSubscription()).then((s) => setState(s ? "on" : "off")).catch(() => {});
  }, []);

  if (state === "unsupported") return null;

  async function enable() {
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); return; }
      const reg = (await navigator.serviceWorker.getRegistration("/sw.js")) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(import.meta.env.VITE_VAPID_PUBLIC_KEY as string) });
      const j = sub.toJSON();
      const { error } = await supabase.rpc("register_push", { p_endpoint: j.endpoint, p_p256dh: j.keys?.p256dh, p_auth: j.keys?.auth, p_locale: locale, p_token: orderToken ?? null });
      setState(error ? "off" : "on");
    } catch { setState("off"); }
  }
  async function disable() {
    setState("busy");
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) { await supabase.rpc("unregister_push", { p_endpoint: sub.endpoint }); await sub.unsubscribe(); }
    setState("off");
  }

  if (state === "denied") return <p className="muted m-0 flex items-center gap-2 text-sm"><BellOff aria-hidden size={18} /> {t("push.denied")}</p>;
  return (
    <button className="btn btn-secondary" disabled={state === "busy"} onClick={state === "on" ? disable : enable}>
      <Bell aria-hidden size={20} strokeWidth={1.75} fill={state === "on" ? "currentColor" : "none"} /> {state === "on" ? t("push.on") : t("push.enable")}
    </button>
  );
}
