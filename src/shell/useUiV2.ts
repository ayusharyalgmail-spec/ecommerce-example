import { useEffect } from "react";
import { useStoreSettings } from "@/lib/queries";

// The ui_v2 rollout flag (UX-D020). Resolution order:
//   1. ?ui=v2 / ?ui=v1 in the URL, remembered in localStorage ("ui"); ?ui=reset clears it. For demos and QA.
//   2. store_settings.ui_v2 from the database, cached in localStorage so repeat visits do not flash the old shell.
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage blocked */ } };

/** Call once at startup, before the first render. */
export function applyUiOverride() {
  const p = new URLSearchParams(window.location.search).get("ui");
  if (p === "v2" || p === "v1") set("ui", p);
  else if (p === "reset") set("ui", null);
}

export function useUiV2(): boolean {
  const { data } = useStoreSettings();
  const flag = data?.ui_v2;
  useEffect(() => { if (flag !== undefined) set("ui_v2", flag ? "1" : "0"); }, [flag]);
  const override = get("ui");
  if (override === "v2") return true;
  if (override === "v1") return false;
  return flag ?? get("ui_v2") === "1";
}
