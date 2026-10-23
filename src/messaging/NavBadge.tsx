import { cn } from "@/ui";
import { badgeText } from "./format";
import { useUnread } from "./hooks";

/** Unread count pill driven by the database count (hidden at zero, "9+" above nine). Decorative: the link's label carries the number. */
export function UnreadPill({ className }: { className?: string }) {
  const { total } = useUnread();
  const text = badgeText(total);
  if (!text) return null;
  return <span aria-hidden key={text} className={cn("cart-bump min-w-5 rounded-pill bg-accent px-1.5 text-center text-xs font-bold leading-5 text-on-accent tabular", className)}>{text}</span>;
}

/** Accessible suffix for the nav label, e.g. "Messages (3 unread)". */
export function useUnreadLabel(label: string, unreadWord: (n: number) => string) {
  const { total } = useUnread();
  return total > 0 ? `${label} (${unreadWord(total)})` : label;
}
