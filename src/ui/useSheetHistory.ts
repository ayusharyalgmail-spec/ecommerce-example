import { useEffect, useRef } from "react";

const KEY = "__sheet";

/**
 * Android system Back closes the topmost sheet/dialog before navigating (SH-7).
 * While `open`, one history entry is pushed; Back (popstate) calls `onClose`. If the sheet is closed by
 * the UI instead (X, swipe, scrim), the entry we pushed is popped so history stays clean.
 *
 * React StrictMode runs effects twice in development. The ref survives that simulated remount, so the
 * second run reuses the entry instead of pushing again, and the clean-up pop is deferred a tick and
 * skipped if the sheet is open again by then.
 */
export function useSheetHistory(open: boolean, onClose: () => void) {
  const idRef = useRef<string | null>(null);
  const openRef = useRef(open);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; openRef.current = open; });

  useEffect(() => {
    if (!open) return;
    let id = idRef.current;
    if (!(id && history.state?.[KEY] === id)) {
      id = Math.random().toString(36).slice(2);
      idRef.current = id;
      history.pushState({ ...(history.state ?? {}), [KEY]: id }, "");
    }
    const mine = id;

    const onPop = () => {
      // Our entry is gone (the user pressed Back): close without touching history again.
      if (history.state?.[KEY] !== mine) { idRef.current = null; closeRef.current(); }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      setTimeout(() => {
        if (openRef.current) return; // still (or again) open: keep the entry
        if (idRef.current === mine && history.state?.[KEY] === mine) history.back();
        if (idRef.current === mine) idRef.current = null;
      }, 0);
    };
  }, [open]);
}
