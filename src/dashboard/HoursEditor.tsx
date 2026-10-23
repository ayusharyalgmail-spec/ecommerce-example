// Hours Editor — manage business operating hours for each day of the week.
import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useT, pick } from "@/lib/i18n";
import { useManagedTenant } from "./useManagedTenant";
import { useTenantHours } from "@/platform/queries";
import { saveTenantHours } from "@/platform/api";
import { Button, Switch } from "@/ui";
import { toast } from "@/ui/toast";
import { Clock, Save, Copy } from "lucide-react";

const DAYS = [
  { day: 0, en: "Sunday", ne: "आइतबार" },
  { day: 1, en: "Monday", ne: "सोमबार" },
  { day: 2, en: "Tuesday", ne: "मंगलबार" },
  { day: 3, en: "Wednesday", ne: "बुधबार" },
  { day: 4, en: "Thursday", ne: "बिहीबार" },
  { day: 5, en: "Friday", ne: "शुक्रबार" },
  { day: 6, en: "Saturday", ne: "शनिबार" },
];

type DaySchedule = {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
};

export default function HoursEditor() {
  const tenant = useManagedTenant();
  const { locale } = useT();
  const qc = useQueryClient();
  const { data: currentHours, isLoading } = useTenantHours(tenant.id);

  const [schedule, setSchedule] = useState<DaySchedule[]>(() =>
    DAYS.map((d) => ({
      day_of_week: d.day,
      open_time: "09:00",
      close_time: "18:00",
      is_closed: d.day === 6, // default Saturday closed in Nepal
    }))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentHours && currentHours.length > 0) {
      setSchedule(
        DAYS.map((d) => {
          const match = currentHours.find((h) => h.day_of_week === d.day);
          return {
            day_of_week: d.day,
            open_time: match?.open_time ? match.open_time.slice(0, 5) : "09:00",
            close_time: match?.close_time ? match.close_time.slice(0, 5) : "18:00",
            is_closed: match?.is_closed ?? (d.day === 6),
          };
        })
      );
    }
  }, [currentHours]);

  const updateDay = (dayIdx: number, patch: Partial<DaySchedule>) => {
    setSchedule((prev) =>
      prev.map((item) => (item.day_of_week === dayIdx ? { ...item, ...patch } : item))
    );
  };

  const applyToAllOpen = () => {
    const sunday = schedule[0];
    setSchedule((prev) =>
      prev.map((item) =>
        item.day_of_week === 6
          ? item // leave Saturday as is
          : { ...item, open_time: sunday.open_time, close_time: sunday.close_time, is_closed: false }
      )
    );
    toast.info(pick(locale, "Applied Sunday hours to all weekdays!", "आइतबारको समय सबै दिनमा लागू गरियो!"));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    const err = await saveTenantHours(
      tenant.id,
      schedule.map((s) => ({
        day_of_week: s.day_of_week,
        open_time: s.is_closed ? null : s.open_time,
        close_time: s.is_closed ? null : s.close_time,
        is_closed: s.is_closed,
      }))
    );
    setSaving(false);

    if (err) {
      toast.error(err);
    } else {
      toast.success(pick(locale, "Opening hours saved!", "समय तालिका सेभ भयो!"));
      qc.invalidateQueries({ queryKey: ["tenant-hours", tenant.id] });
    }
  }, [schedule, tenant.id, locale, qc]);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5 mb-6">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <Clock className="text-[var(--brand)]" size={26} />
            {pick(locale, "Business Hours", "खुल्ने तथा बन्द हुने समय")}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {pick(
              locale,
              "Specify your open and close times for each day so customers know when to visit.",
              "ग्राहकहरूलाई सजिलो होस् भन्नका लागि प्रत्येक दिनको खुल्ने र बन्द हुने समय तय गर्नुहोस्।"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={applyToAllOpen} className="gap-1.5 text-xs">
            <Copy size={14} />
            {pick(locale, "Copy Sun to All Weekdays", "आइतबारको समय सबैमा लागू")}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save size={18} />
            {saving ? pick(locale, "Saving...", "बचत गर्दै...") : pick(locale, "Save Hours", "समय सेभ गर्नुहोस्")}
          </Button>
        </div>
      </div>

      {/* Schedule Table / List */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] overflow-hidden shadow-sm">
        <div className="divide-y divide-[var(--line)]">
          {schedule.map((item) => {
            const dayMeta = DAYS.find((d) => d.day === item.day_of_week)!;
            return (
              <div
                key={item.day_of_week}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-colors ${
                  item.is_closed ? "bg-[var(--surface-2)]/40 opacity-75" : "hover:bg-[var(--surface-2)]/20"
                }`}
              >
                {/* Day name & Closed Switch */}
                <div className="flex items-center gap-4 sm:w-48">
                  <Switch
                    label={pick(locale, dayMeta.en, dayMeta.ne)}
                    checked={!item.is_closed}
                    onCheckedChange={(open: boolean) => updateDay(item.day_of_week, { is_closed: !open })}
                  />
                  <div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {item.is_closed
                        ? pick(locale, "Closed", "बन्द")
                        : pick(locale, "Open", "खुल्ला")}
                    </span>
                  </div>
                </div>

                {/* Times or Closed Label */}
                <div className="flex items-center gap-3">
                  {!item.is_closed ? (
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">
                          {pick(locale, "Opens", "खुल्ने")}
                        </span>
                        <input
                          type="time"
                          value={item.open_time}
                          onChange={(e) => updateDay(item.day_of_week, { open_time: e.target.value })}
                          className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-sm font-medium focus:border-[var(--brand)] focus:outline-none"
                        />
                      </div>
                      <span className="text-[var(--text-muted)] mt-3">–</span>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">
                          {pick(locale, "Closes", "बन्द")}
                        </span>
                        <input
                          type="time"
                          value={item.close_time}
                          onChange={(e) => updateDay(item.day_of_week, { close_time: e.target.value })}
                          className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-sm font-medium focus:border-[var(--brand)] focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="rounded-md bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
                      {pick(locale, "Closed all day", "दिनभर बन्द")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
