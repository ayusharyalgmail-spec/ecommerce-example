import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Search, X } from "@/ui";
import { useT, pick } from "@/lib/i18n";
import { clearSearches, recentSearches, recordSearch, useSuggestions } from "./data";

/**
 * Search field with recent searches and suggestions in a flat listbox panel (not glass: it is part of the page flow).
 * Input is debounced 250 ms and ignored while an IME composition is open, so Nepali typing is not interrupted.
 */
export function SearchBox({ initial = "", onSubmit }: { initial?: string; onSubmit?: (q: string) => void }) {
  const { t, locale } = useT();
  const nav = useNavigate();
  const [value, setValue] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const composing = useRef(false);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (composing.current) return;
    const id = window.setTimeout(() => setDebounced(value), 250);
    return () => window.clearTimeout(id);
  }, [value]);
  useEffect(() => {
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);

  const sugg = useSuggestions(debounced).data ?? [];
  const recents = open && !value.trim() ? recentSearches() : [];
  type Item = { key: string; label: string; icon: "recent" | "search"; run: () => void };
  const go = (q: string) => { recordSearch(q); setOpen(false); if (onSubmit) onSubmit(q); else nav(`/shop?q=${encodeURIComponent(q.trim())}`); };
  const items: Item[] = value.trim()
    ? sugg.map((s) => ({ key: s.slug, label: pick(locale, s.name_en, s.name_ne), icon: "search" as const, run: () => { recordSearch(value); setOpen(false); nav(`/product/${s.slug}`); } }))
    : recents.map((r) => ({ key: r, label: r, icon: "recent" as const, run: () => go(r) }));

  return (
    <div ref={root} className="relative" role="search">
      <form onSubmit={(e) => { e.preventDefault(); if (active >= 0 && items[active]) items[active].run(); else go(value); }}>
        <label className="sr-only-text" htmlFor={listId + "i"}>{t("shop.search")}</label>
        <div className="relative">
          <Search aria-hidden size={20} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input id={listId + "i"} type="search" enterKeyHint="search" autoComplete="off"
            role="combobox" aria-expanded={open && items.length > 0} aria-controls={listId} aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            value={value} placeholder={t("shop.search")}
            onFocus={() => setOpen(true)}
            onChange={(e) => { setValue(e.target.value); setActive(-1); setOpen(true); }}
            onCompositionStart={() => { composing.current = true; }}
            onCompositionEnd={(e) => { composing.current = false; setDebounced(e.currentTarget.value); }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
            }}
            style={{ paddingLeft: 40, paddingRight: 48 }} // inline: legacy unlayered input rules would override utilities until the shell is fully migrated
            className="min-h-12 w-full rounded-sm border border-line-strong bg-surface text-base text-ink" />
          {value && (
            <button type="button" aria-label={t("search.clear")} onClick={() => { setValue(""); setDebounced(""); }}
              className="absolute right-0 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center text-ink"><X aria-hidden size={18} strokeWidth={2} /></button>
          )}
        </div>
      </form>
      {open && items.length > 0 && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-line bg-surface shadow-[var(--e2)]">
          <ul id={listId} role="listbox" aria-label={t("search.suggestions")} className="m-0 list-none p-0">
            {items.map((it, i) => (
              <li key={it.key} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <button type="button" onClick={it.run} className={`flex min-h-12 w-full items-center gap-3 px-3 text-left text-ink ${i === active ? "bg-surface-2" : ""}`}>
                  {it.icon === "recent" ? <Clock aria-hidden size={18} strokeWidth={1.75} className="text-muted" /> : <Search aria-hidden size={18} strokeWidth={1.75} className="text-muted" />}
                  <span className="line-clamp-1">{it.label}</span>
                </button>
              </li>
            ))}
          </ul>
          {!value.trim() && recents.length > 0 && (
            <button type="button" onClick={() => { clearSearches(); setOpen(false); }} className="min-h-12 w-full border-t border-line px-3 text-left text-sm font-semibold text-ink">{t("search.clear_recent")}</button>
          )}
        </div>
      )}
    </div>
  );
}
