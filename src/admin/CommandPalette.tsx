import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, Search, type LucideIcon } from "@/ui";
import { useT } from "@/lib/i18n";

export type Command = { id: string; label: string; icon: LucideIcon; to: string };

/** Ctrl+K (Cmd+K) jump menu for the vendor dashboard. Pure navigation; every target still enforces its own permission in the database. */
export function CommandPalette({ commands }: { commands: Command[] }) {
  const { t } = useT();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setQ(""); setActive(0); setOpen((o) => !o); } };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const list = commands;
  const shown = useMemo(() => list.filter((c) => c.label.toLowerCase().includes(q.trim().toLowerCase())), [list, q]);
  const go = (to: string) => { setOpen(false); nav(to); };
  return (
    <Dialog open={open} onOpenChange={setOpen} title={t("admin.palette")} closeLabel={t("common.close")}>
      <div className="relative">
        <Search aria-hidden size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input role="combobox" aria-expanded aria-controls="palette-list" aria-label={t("admin.palette")} value={q} placeholder={t("admin.palette.placeholder")} autoComplete="off"
          style={{ paddingLeft: 40 }} className="min-h-12 w-full rounded-sm border border-line-strong bg-surface text-base text-ink"
          onChange={(e) => { setQ(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(shown.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
            else if (e.key === "Enter" && shown[active]) { e.preventDefault(); go(shown[active].to); }
          }} />
      </div>
      <ul id="palette-list" role="listbox" className="m-0 mt-2 max-h-72 list-none overflow-y-auto p-0">
        {shown.map((c, i) => (
          <li key={c.id} role="option" aria-selected={i === active}>
            <button type="button" onClick={() => go(c.to)} className={`flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left text-ink ${i === active ? "bg-surface-2" : ""}`}>
              <c.icon aria-hidden size={20} strokeWidth={1.75} />{c.label}
            </button>
          </li>
        ))}
        {!shown.length && <li className="p-3 text-muted">{t("admin.palette.none")}</li>}
      </ul>
    </Dialog>
  );
}
