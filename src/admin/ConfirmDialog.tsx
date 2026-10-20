import { Button, Dialog } from "@/ui";
import { useT } from "@/lib/i18n";

/** Confirmation for actions that move money or cannot be undone (cancel, reject, refund, payment decision, COD collected). */
export function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel, danger, busy, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; body: React.ReactNode; confirmLabel: string; danger?: boolean; busy?: boolean; onConfirm: () => void;
}) {
  const { t } = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} closeLabel={t("common.close")}>
      <div className="space-y-4">
        <div className="text-ink">{body}</div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button variant={danger ? "danger" : "primary"} loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </Dialog>
  );
}
