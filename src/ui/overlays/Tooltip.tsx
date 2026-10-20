// Heavy chunk (Radix Tooltip). Use <Tooltip> from "@/ui".
import * as T from "@radix-ui/react-tooltip";

export type TooltipProps = {
  /** Short text; tooltips never hold interactive content or information needed to complete a task. */
  label: string;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
};

/** Shows on keyboard focus and on hover (hover-capable pointers); touch users get the visible label elsewhere. */
export default function TooltipImpl({ label, children, side = "top" }: TooltipProps) {
  return (
    <T.Provider delayDuration={350} skipDelayDuration={200}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content side={side} sideOffset={6} className="glass z-50 rounded-lg px-3 py-1.5 text-sm font-semibold">{label}</T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}
