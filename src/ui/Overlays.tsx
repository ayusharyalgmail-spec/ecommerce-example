import { lazy, Suspense, useEffect, useState } from "react";
import type { DialogProps } from "./overlays/Dialog";
import type { SheetProps } from "./overlays/Sheet";
import type { PopoverProps } from "./overlays/Popover";
import type { TooltipProps } from "./overlays/Tooltip";

// Overlays are heavy (Radix + Vaul, about 40 kB gzip together). They live in their own chunks and are
// fetched on first use so they never count against the storefront entry budget (PRD 5, ARCHITECTURE 9.1).
const DialogImpl = lazy(() => import("./overlays/Dialog"));
const SheetImpl = lazy(() => import("./overlays/Sheet"));
const PopoverImpl = lazy(() => import("./overlays/Popover"));
const TooltipImpl = lazy(() => import("./overlays/Tooltip"));

/** Mount the heavy implementation on first open and keep it mounted so close animations can finish. */
function useEverOpened(open: boolean) {
  const [ever, setEver] = useState(open);
  if (open && !ever) setEver(true); // derived during render: no effect, no extra paint
  return ever;
}

export function Dialog(props: DialogProps) {
  const mount = useEverOpened(props.open);
  return mount ? <Suspense fallback={null}><DialogImpl {...props} /></Suspense> : null;
}

export function Sheet(props: SheetProps) {
  const mount = useEverOpened(props.open);
  return mount ? <Suspense fallback={null}><SheetImpl {...props} /></Suspense> : null;
}

/** Until the chunk arrives the trigger renders as-is (inert); the chunk is prefetched when the page is idle. */
export function Popover(props: PopoverProps) {
  useEffect(() => {
    const id = window.setTimeout(() => { void import("./overlays/Popover"); }, 1500);
    return () => window.clearTimeout(id);
  }, []);
  return <Suspense fallback={props.trigger}><PopoverImpl {...props} /></Suspense>;
}

/** Same pattern: children render immediately, the tooltip behaviour attaches once the chunk is ready. */
export function Tooltip(props: TooltipProps) {
  return <Suspense fallback={props.children}><TooltipImpl {...props} /></Suspense>;
}
