import { useState } from "react";
import { Link } from "react-router-dom";
import { Gift, ImageOff, Megaphone, MessageCircle, Package, Tag, TriangleAlert, cn, type LucideIcon } from "@/ui";
import { dateLocale, useT, type Locale } from "@/lib/i18n";
import { campaignImage, type FeedItem, type Kind } from "./api";
import { safeCta } from "./format";

/** One accent per category, used only on tiles, icon chips and the unread bar (the rest of the page stays on the shop's own tokens). */
export const CATEGORY: Record<Kind, { icon: LucideIcon; color: string }> = {
  chat: { icon: MessageCircle, color: "#0f9d8a" },
  order: { icon: Package, color: "#2563eb" },
  alert: { icon: Megaphone, color: "#d97706" },
  promo: { icon: Gift, color: "#e11d74" },
};

export const accent = (k: Kind) => ({ "--c": CATEGORY[k].color }) as React.CSSProperties;
export const chipTone = "bg-[color-mix(in_oklab,var(--c)_14%,var(--surface))] text-[color-mix(in_oklab,var(--c)_72%,var(--ink))]";

export function formatWhen(iso: string, locale: Locale) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return d.toLocaleString(dateLocale(locale), sameDay ? { timeStyle: "short" } : { dateStyle: "medium" });
}

/** Resolved display text for a feed item in the viewer's language. Order notices come from the dictionary, campaigns from the authored fields. */
export function useItemText() {
  const { t, locale } = useT();
  return (it: FeedItem) => {
    if (it.kind === "order") {
      const known = ["pending_confirmation", "confirmed", "processing", "dispatched", "delivered", "cancelled", "rejected"].includes(it.code ?? "");
      const c = known ? it.code! : "update";
      return { title: t(`msg.order.${c}.title`, { n: it.order_number ?? "" }), body: t(`msg.order.${c}.body`, { n: it.order_number ?? "" }) };
    }
    return {
      title: (locale === "ne" && it.title_ne) || it.title || "",
      body: (locale === "ne" && it.body_ne) || it.body || "",
      cta: (locale === "ne" && it.cta_label_ne) || it.cta_label || null,
    };
  };
}

/** Banner with a fixed ratio and a quiet fallback when the file is missing or fails to load. */
export function Banner({ path, className, ratio = "aspect-[16/7]" }: { path?: string | null; className?: string; ratio?: string }) {
  const [bad, setBad] = useState(false);
  const src = campaignImage(path);
  if (!src) return null;
  return bad ? (
    <div className={cn("flex items-center justify-center bg-surface-2 text-muted", ratio, className)}><ImageOff aria-hidden size={28} strokeWidth={1.5} /></div>
  ) : (
    <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBad(true)} className={cn("w-full bg-surface-2 object-cover", ratio, className)} />
  );
}

export function CtaLink({ url, label, onClick, className }: { url: string | null | undefined; label: string; onClick?: () => void; className?: string }) {
  const cta = safeCta(url);
  if (!cta) return null;
  return cta.external
    ? <a href={cta.href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>{label}</a>
    : <Link to={cta.href} onClick={onClick} className={className}>{label}</Link>;
}

export const ctaStyle = "inline-flex min-h-11 items-center justify-center rounded-md border border-[color-mix(in_oklab,var(--c)_45%,var(--line))] px-4 text-sm font-semibold text-[color-mix(in_oklab,var(--c)_72%,var(--ink))] no-underline transition-colors hover-fine:hover:bg-[color-mix(in_oklab,var(--c)_10%,var(--surface))]";

/** Feed card. The body button opens the message; the CTA is a separate link so the two never fight over navigation. */
export function FeedCard({ item, onOpen, onCta }: { item: FeedItem; onOpen: () => void; onCta: () => void }) {
  const { t, locale } = useT();
  const text = useItemText()(item) as { title: string; body: string; cta?: string | null };
  const Icon = item.kind === "order" ? Package : item.kind === "promo" ? Tag : TriangleAlert;
  const cta = item.kind === "order" ? { url: "/account", label: t("msg.view_order") } : { url: item.cta_url, label: text.cta ?? "" };
  return (
    <article style={accent(item.kind)} className={cn("relative overflow-hidden rounded-lg border bg-surface shadow-[var(--e1)]", item.unread ? "border-[color-mix(in_oklab,var(--c)_40%,var(--line))]" : "border-line")}>
      {item.unread && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[var(--c)]" />}
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <Banner path={item.image_path} />
        <span className="flex gap-3 p-3 pl-4">
          <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", chipTone)}><Icon size={20} strokeWidth={1.9} /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className={cn("min-w-0 truncate text-[0.9375rem] text-ink", item.unread ? "font-bold" : "font-semibold")}>{text.title}</span>
              <time dateTime={item.at} className="shrink-0 text-xs text-muted">{formatWhen(item.at, locale)}</time>
            </span>
            <span className="mt-0.5 line-clamp-2 break-words text-sm text-muted">{text.body}</span>
          </span>
          {item.unread && <><span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-[var(--c)]" /><span className="sr-only-text">{t("msg.unread")}</span></>}
        </span>
      </button>
      {safeCta(cta.url) && cta.label && (
        <div className="px-3 pb-3 pl-4"><CtaLink url={cta.url} label={cta.label} onClick={onCta} className={ctaStyle} /></div>
      )}
    </article>
  );
}
