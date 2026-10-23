// Inquiries View — customer contact submissions and leads inbox.
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useT, pick } from "@/lib/i18n";
import { useManagedTenant } from "./useManagedTenant";
import { useTenantInquiries, type Inquiry } from "@/platform/queries";
import { markInquiryRead } from "@/platform/api";
import { Button, Badge } from "@/ui";
import { toast } from "@/ui/toast";
import { Mail, Phone, Clock, CheckCircle2, MessageSquare, ExternalLink } from "lucide-react";

export default function InquiriesView() {
  const tenant = useManagedTenant();
  const { locale } = useT();
  const qc = useQueryClient();
  const { data: inquiries, isLoading } = useTenantInquiries(tenant.id);

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingId, setMarkingId] = useState<string | null>(null);

  const handleMarkRead = useCallback(
    async (id: string) => {
      setMarkingId(id);
      const err = await markInquiryRead(id);
      setMarkingId(null);
      if (err) {
        toast.error(err);
      } else {
        toast.success(pick(locale, "Marked as read", "पढिएको चिन्ह लगाइयो"));
        qc.invalidateQueries({ queryKey: ["tenant-inquiries", tenant.id] });
      }
    },
    [locale, qc, tenant.id]
  );

  const unreadCount = inquiries?.filter((i) => !i.is_read).length ?? 0;
  const filteredList =
    inquiries?.filter((i) => (filter === "unread" ? !i.is_read : true)) ?? [];

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5 mb-6">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <Mail className="text-[var(--brand)]" size={26} />
            {pick(locale, "Customer Inquiries", "ग्राहकका सोधपुछ तथा सन्देशहरू")}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {pick(
              locale,
              "Messages submitted by visitors through your website contact form.",
              "वेबसाइटको सम्पर्क फाराममार्फत ग्राहकहरूले पठाएका सोधपुछहरू।"
            )}
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 bg-[var(--surface-2)] p-1 rounded-xl">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === "all" ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            {pick(locale, "All Messages", "सबै सन्देश")} ({inquiries?.length ?? 0})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === "unread" ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            {pick(locale, "Unread", "नपढिएका")}
            {unreadCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand)] px-1 text-[10px] font-bold text-black">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Messages List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
          ))}
        </div>
      ) : filteredList.length > 0 ? (
        <div className="space-y-4">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border p-5 shadow-sm transition-all ${
                item.is_read
                  ? "border-[var(--line)] bg-[var(--surface)] opacity-90"
                  : "border-[var(--brand)]/40 bg-[var(--surface)] ring-1 ring-[var(--brand)]/20"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line)]/60 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-[var(--ink)]">{item.name}</h3>
                  {!item.is_read && (
                    <span className="rounded-full bg-[var(--brand-tint)] px-2.5 py-0.5 text-xs font-semibold text-[var(--brand-strong)]">
                      {pick(locale, "New", "नयाँ")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Clock size={13} />
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Message body */}
              <p className="text-sm text-[var(--ink)] whitespace-pre-wrap mb-4 bg-[var(--surface-2)]/40 p-3.5 rounded-xl border border-[var(--line)]/40">
                {item.message}
              </p>

              {/* Contact info & Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                  {item.phone && (
                    <a
                      href={`tel:${item.phone}`}
                      className="inline-flex items-center gap-1.5 font-medium text-[var(--brand-strong)] hover:underline"
                    >
                      <Phone size={14} />
                      {item.phone}
                    </a>
                  )}
                  {item.email && (
                    <a
                      href={`mailto:${item.email}`}
                      className="inline-flex items-center gap-1.5 font-medium text-[var(--brand-strong)] hover:underline"
                    >
                      <Mail size={14} />
                      {item.email}
                    </a>
                  )}
                </div>

                {!item.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={markingId === item.id}
                    onClick={() => handleMarkRead(item.id)}
                    className="gap-1.5 text-xs"
                  >
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    {pick(locale, "Mark as Read", "पढियो भनी चिन्ह लगाउनुहोस्")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] p-12 text-center">
          <MessageSquare className="text-[var(--text-muted)] opacity-30 mb-3" size={40} />
          <h3 className="text-base font-semibold">
            {filter === "unread"
              ? pick(locale, "No unread inquiries", "कुनै नयाँ सोधपुछ बाँकी छैन")
              : pick(locale, "No inquiries yet", "अहिलेसम्म कुनै सोधपुछ प्राप्त भएको छैन")}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
            {pick(
              locale,
              "When visitors submit questions through your business page, they will show up here.",
              "ग्राहकहरूले तपाईंको वेबसाइटबाट सन्देश पठाउँदा यहाँ देखिनेछन्।"
            )}
          </p>
        </div>
      )}
    </div>
  );
}
