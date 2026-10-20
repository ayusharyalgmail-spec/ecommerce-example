import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Button, toast } from "@/ui";
import { useT } from "@/lib/i18n";
import { usePendingOrders } from "./usePending";

/**
 * New-order alerts for staff while the app is open: a toast with a View action, a vibration on phones, a system
 * notification when the browser allows it, and the count in the tab title. Background alerts when the app is closed
 * come from Web Push (the existing worker); this covers "someone just ordered" while the vendor is looking at the screen.
 */
export default function OrderAlerts() {
  const { t } = useT();
  const nav = useNavigate();
  const { data } = usePendingOrders();
  const last = useRef<number | null>(null);
  const baseTitle = useRef(document.title);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() => (typeof Notification === "undefined" ? "unsupported" : Notification.permission));

  useEffect(() => {
    if (data === undefined) return;
    if (last.current !== null && data > last.current) {
      const n = data - last.current;
      toast.info(t("alerts.new_order", { n }), { action: { label: t("alerts.view"), onClick: () => nav("/admin/orders?tab=pending") } });
      try { navigator.vibrate?.([200, 100, 200]); } catch { /* unsupported */ }
      if (perm === "granted" && document.visibilityState !== "visible") { try { new Notification(t("alerts.new_order", { n }), { icon: "/icon.svg" }); } catch { /* blocked */ } }
    }
    last.current = data;
  }, [data, nav, perm, t]);

  useEffect(() => {
    const original = baseTitle.current;
    document.title = data ? `(${data}) ${original.replace(/^\(\d+\)\s*/, "")}` : original.replace(/^\(\d+\)\s*/, "");
    return () => { document.title = original; };
  }, [data]);

  if (perm !== "default") return null;
  return (
    <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-3 px-4 py-2 text-ink sm:px-6">
      <Bell aria-hidden size={20} strokeWidth={1.75} />
      <span className="flex-1 text-sm font-semibold">{t("alerts.enable_hint")}</span>
      <Button size="sm" onClick={async () => setPerm(await Notification.requestPermission())}>{t("alerts.enable")}</Button>
    </div>
  );
}
