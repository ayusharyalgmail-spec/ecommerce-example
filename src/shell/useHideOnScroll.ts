import { useEffect, useState } from "react";

/**
 * True while the user scrolls down on a compact screen: the top bar slides away (transform only, so no
 * layout shift) and returns on any upward scroll or near the top. Never hides on md+ screens.
 * The handler is passive and does a few comparisons, so it runs directly (no rAF, which background tabs pause).
 */
export function useHideOnScroll(thresholdPx = 10, minY = 80) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const compact = window.matchMedia("(max-width: 839px)");
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (!compact.matches || y < minY) { setHidden(false); last = y; return; }
      if (Math.abs(y - last) < thresholdPx) return;
      setHidden(y > last);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [thresholdPx, minY]);
  return hidden;
}
