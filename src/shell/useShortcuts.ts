import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const typing = (el: EventTarget | null) => {
  const e = el as HTMLElement | null;
  if (!e) return false;
  return e.isContentEditable || /^(input|textarea|select)$/i.test(e.tagName);
};

/**
 * Windows/desktop keyboard shortcuts (DESIGN.md section 11): "/" search, "g" then "c|h|s|t" to go to
 * cart/home/shop/track, "?" for help. Ignored while typing and when a modifier key is held.
 */
export function useShortcuts(onHelp: () => void) {
  const nav = useNavigate();
  const pendingG = useRef<number | null>(null);
  useEffect(() => {
    const clear = () => { if (pendingG.current) { window.clearTimeout(pendingG.current); pendingG.current = null; } };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      if (pendingG.current) {
        const map: Record<string, string> = { c: "/cart", h: "/", s: "/shop", t: "/track" };
        const to = map[e.key.toLowerCase()];
        clear();
        if (to) { e.preventDefault(); nav(to, { viewTransition: true }); }
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        const box = document.getElementById("site-search") as HTMLInputElement | null;
        if (box && box.offsetParent !== null) box.focus(); else nav("/shop?focus=search");
      } else if (e.key === "?") { e.preventDefault(); onHelp(); }
      else if (e.key === "g") { pendingG.current = window.setTimeout(clear, 1200); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); clear(); };
  }, [nav, onHelp]);
}
