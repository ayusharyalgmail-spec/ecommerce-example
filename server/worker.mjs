// Web Push worker (ARCHITECTURE.md §9). A plain Node script: no framework needed.
//
//   npm run worker            # loops forever, one pass per minute
//   npm run worker -- --once  # single pass (for cron / Task Scheduler)
//
// It claims queued notification events through SQL functions guarded by a shared secret
// (WORKER_SECRET), sends them with VAPID, and records what the push service answered.
// Payloads contain only the event type, locale and a deep link; the service worker builds the text.
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const need = (k) => { const v = process.env[k]; if (!v) { console.error(`Missing ${k} (run with --env-file=.env.local)`); process.exit(1); } return v; };
const supabase = createClient(need("VITE_SUPABASE_URL"), need("VITE_SUPABASE_ANON_KEY"), { auth: { persistSession: false } });
const secret = need("WORKER_SECRET");
webpush.setVapidDetails(need("VAPID_SUBJECT"), need("VITE_VAPID_PUBLIC_KEY"), need("VAPID_PRIVATE_KEY"));

async function pass() {
  const { data, error } = await supabase.rpc("worker_claim_batch", { p_secret: secret, p_limit: 20 });
  if (error) { console.error("claim failed:", error.message); return; }
  let submitted = 0;
  for (const ev of data ?? []) {
    const url = ev.audience === "staff" ? (ev.orderId ? `/admin/orders/${ev.orderId}` : "/admin") : "/account";
    const results = await Promise.all(ev.subscriptions.map(async (s) => {
      try {
        const res = await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ type: ev.type, url, locale: s.locale, id: ev.id }), { TTL: 3600 });
        return { subscriptionId: s.id, status: "submitted", http: res.statusCode };
      } catch (e) {
        const code = e?.statusCode;
        if (code === 404 || code === 410) return { subscriptionId: s.id, status: "gone", http: code };
        return { subscriptionId: s.id, status: "failed", http: code ?? "", error: String(e?.message ?? e) };
      }
    }));
    submitted += results.filter((r) => r.status === "submitted").length;
    const rec = await supabase.rpc("worker_record", { p_secret: secret, p_event_id: ev.id, p_results: results });
    if (rec.error) console.error("record failed:", rec.error.message);
  }
  console.log(`${new Date().toISOString()} events=${(data ?? []).length} submitted=${submitted}`);
}

if (process.argv.includes("--once")) { await pass(); process.exit(0); }
console.log("push worker started (every 60s)");
for (;;) { await pass().catch((e) => console.error(e)); await new Promise((r) => setTimeout(r, 60_000)); }
