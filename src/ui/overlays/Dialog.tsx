// Heavy chunk (Radix Dialog). Never import this file directly: use <Dialog> from "@/ui", which loads it on first open.
import * as D from "@radix-ui/react-dialog";
import { X } from "../icons";
import { cn } from "../cn";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Accessible name for the close button (translated). */
  closeLabel: string;
  children?: React.ReactNode;
  className?: string;
};

/** Glass dialog on a 40% ink scrim. Radix provides focus trap, focus return, Esc and aria wiring. */
export default function DialogImpl({ open, onOpenChange, title, description, closeLabel, children, className }: DialogProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--ink)_40%,transparent)] data-[state=open]:animate-[fade-in_var(--duration-2)_var(--ease-out)]" />
        <D.Content
          className={cn(
            "glass fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl p-5",
            "data-[state=open]:animate-[dialog-in_var(--duration-3)_var(--ease-out)]",
            className
          )}
        >
          <D.Title className="m-0 pr-12 text-xl font-bold">{title}</D.Title>
          {description ? <D.Description className="mt-1 text-base">{description}</D.Description> : <D.Description className="sr-only-text">{title}</D.Description>}
          <div className="mt-4">{children}</div>
          <D.Close aria-label={closeLabel} className="absolute right-2 top-2 inline-flex size-12 items-center justify-center rounded-full">
            <X aria-hidden size={24} strokeWidth={1.75} />
          </D.Close>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
