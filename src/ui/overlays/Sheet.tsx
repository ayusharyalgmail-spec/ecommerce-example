// Heavy chunk (Vaul on Radix Dialog). Use <Sheet> from "@/ui"; it loads this file on first open.
import { Drawer } from "vaul";
import { useSheetHistory } from "../useSheetHistory";
import { cn } from "../cn";

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
};

/** Bottom sheet on glass: drag handle, drag to dismiss, system Back closes it before navigating. */
export default function SheetImpl({ open, onOpenChange, title, description, children, className }: SheetProps) {
  useSheetHistory(open, () => onOpenChange(false));
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--ink)_40%,transparent)]" />
        <Drawer.Content
          className={cn("glass fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] max-w-2xl flex-col rounded-t-xl outline-none", className)}
          style={{ paddingBottom: "var(--safe-bottom)" }}
        >
          <span aria-hidden className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-[var(--line-strong)]" />
          <Drawer.Title className="m-0 px-5 pt-3 text-xl font-bold">{title}</Drawer.Title>
          {description ? <Drawer.Description className="m-0 px-5 text-base">{description}</Drawer.Description> : <Drawer.Description className="sr-only-text">{title}</Drawer.Description>}
          <div className="overflow-y-auto overscroll-contain p-5">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
