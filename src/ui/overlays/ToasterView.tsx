// Heavy chunk (Sonner). Loaded by <ToastHost> on the first toast.
import { Toaster, toast as sonner } from "sonner";
import type { ToastMessage } from "../toast";

const ICON_TONE = { success: "text-success", error: "text-danger", info: "text-info" } as const;

export function push(m: ToastMessage) {
  const base = { id: m.id, duration: m.action ? 6000 : 4000, description: m.description, action: m.action ? { label: m.action.label, onClick: m.action.onClick } : undefined };
  if (m.tone === "success") sonner.success(m.title, base);
  else if (m.tone === "error") sonner.error(m.title, base);
  else sonner.info(m.title, base);
}

/** Glass toasts, at most 2 visible (DESIGN.md section 8), sitting above the floating bottom nav on compact screens. */
export function ToasterView({ closeLabel }: { closeLabel: string }) {
  return (
    <Toaster
      position="bottom-center"
      visibleToasts={2}
      offset={{ bottom: "calc(88px + env(safe-area-inset-bottom))", left: 12, right: 12 }}
      mobileOffset={{ bottom: "calc(88px + env(safe-area-inset-bottom))", left: 12, right: 12 }}
      closeButton
      toastOptions={{
        unstyled: true,
        closeButton: false,
        classNames: {
          toast: "glass flex w-full items-center gap-3 rounded-lg p-4 text-base",
          title: "font-semibold",
          description: "text-sm",
          actionButton: "ml-auto inline-flex min-h-12 items-center rounded-md bg-brand px-4 font-semibold text-on-brand",
          success: ICON_TONE.success, error: ICON_TONE.error, info: ICON_TONE.info,
        },
      }}
      aria-label={closeLabel}
    />
  );
}
