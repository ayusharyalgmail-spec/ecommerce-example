import { Dialog } from "@/ui";
import { useT } from "@/lib/i18n";

const ROWS: [string[], string][] = [
  [["/"], "shortcuts.search"],
  [["g", "h"], "shortcuts.home"],
  [["g", "s"], "shortcuts.shop"],
  [["g", "c"], "shortcuts.cart"],
  [["g", "t"], "shortcuts.track"],
  [["?"], "shortcuts.help"],
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("shortcuts.title")} description={t("shortcuts.hint")} closeLabel={t("common.close")}>
      <dl className="m-0 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
        {ROWS.map(([keys, label]) => (
          <div key={label} className="contents">
            <dt className="flex items-center gap-1">
              {keys.map((k, i) => <span key={i} className="flex items-center gap-1">{i > 0 && <span aria-hidden className="text-sm">+</span>}<kbd className="min-w-8 rounded-xs border border-[var(--line-strong)] bg-surface px-2 py-1 text-center font-mono text-sm">{k}</kbd></span>)}
            </dt>
            <dd className="m-0">{t(label)}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
