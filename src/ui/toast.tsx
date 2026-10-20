import { lazy, Suspense, useEffect, useState } from "react";

export type ToastMessage = {
  id?: string | number;
  tone: "success" | "error" | "info";
  title: string;
  description?: string;
  /** Undo (or any single follow-up) action; gives the toast a longer life. */
  action?: { label: string; onClick: () => void };
};

// The toast library (about 12 kB gzip) is fetched on the first toast, not at startup.
type Listener = (m: ToastMessage) => void;
let listener: Listener | null = null;
const pending: ToastMessage[] = [];

function emit(m: ToastMessage) {
  if (listener) listener(m); else pending.push(m);
}

export const toast = {
  success: (title: string, o: Omit<ToastMessage, "tone" | "title"> = {}) => emit({ tone: "success", title, ...o }),
  error: (title: string, o: Omit<ToastMessage, "tone" | "title"> = {}) => emit({ tone: "error", title, ...o }),
  info: (title: string, o: Omit<ToastMessage, "tone" | "title"> = {}) => emit({ tone: "info", title, ...o }),
};

const View = lazy(() => import("./overlays/ToasterView").then((m) => ({ default: m.ToasterView })));

/** Mount once near the root. Renders nothing until the first toast is requested. */
export function ToastHost({ closeLabel }: { closeLabel: string }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    listener = (m) => {
      setActive(true);
      // Mount the Toaster first, then push, so the message is not lost.
      void import("./overlays/ToasterView").then((mod) => window.setTimeout(() => mod.push(m), 0));
    };
    while (pending.length) listener(pending.shift()!);
    return () => { listener = null; };
  }, []);

  return active ? <Suspense fallback={null}><View closeLabel={closeLabel} /></Suspense> : null;
}
