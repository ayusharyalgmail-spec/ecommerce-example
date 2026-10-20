import { createContext, useContext, useEffect } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

// The ONLY way to produce glass in code (DESIGN.md section 8). It enforces, in development:
//  - never nest glass inside glass
//  - at most 3 glass panels mounted at once
// Production builds skip the checks (they are guards for authors, not user-facing behaviour).

const NestCtx = createContext(false);
let mounted = 0;
const MAX = 3;

const panelStyles = cva("glass", {
  variants: {
    shape: {
      bar: "rounded-none",                      // header, sticky buy bar
      pill: "rounded-pill",                     // floating bottom nav
      sheet: "rounded-t-xl",                    // bottom sheets
      dialog: "rounded-xl",                     // dialogs, popovers, palette
      toast: "rounded-lg",
      chip: "rounded-pill px-2.5 py-1 text-xs", // small overlays on images
    },
  },
  defaultVariants: { shape: "dialog" },
});

type Props<T extends React.ElementType> = VariantProps<typeof panelStyles> & {
  as?: T;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function GlassPanel<T extends React.ElementType = "div">({ as, shape, className, children, ...rest }: Props<T>) {
  const nested = useContext(NestCtx);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    mounted += 1;
    if (mounted > MAX) console.error(`GlassPanel: ${mounted} glass surfaces are mounted; the limit is ${MAX} (DESIGN.md 3.4).`);
    return () => { mounted -= 1; };
  }, []);
  if (import.meta.env.DEV && nested) console.error("GlassPanel: glass must not be nested inside glass (DESIGN.md 3.4).");

  const Tag = (as ?? "div") as React.ElementType;
  return (
    <NestCtx.Provider value>
      <Tag className={cn(panelStyles({ shape }), className)} {...rest}>{children}</Tag>
    </NestCtx.Provider>
  );
}
