// Heavy chunk (Radix Popover). Use <Popover> from "@/ui".
import * as P from "@radix-ui/react-popover";
import { cn } from "../cn";

export type PopoverProps = {
  /** The element that opens the popover; must be a single focusable element (a Button or IconButton). */
  trigger: React.ReactElement;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  /** Optional controlled mode, so menu items can close the popover. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function PopoverImpl({ trigger, children, align = "center", className, open, onOpenChange }: PopoverProps) {
  return (
    <P.Root open={open} onOpenChange={onOpenChange}>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content align={align} sideOffset={8} collisionPadding={12} className={cn("glass z-50 max-w-[calc(100vw-1.5rem)] rounded-xl p-4", className)}>
          {children}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
