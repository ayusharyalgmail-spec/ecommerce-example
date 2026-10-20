import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Dialog, Mail, MessageCircle, Palette, Phone, Sheet } from "@/ui";
import { useT } from "@/lib/i18n";
import { useStoreSettings } from "@/lib/queries";
import { AppearancePanel } from "./AppearancePanel";

const link = "inline-flex min-h-12 items-center gap-2 text-ink";

/** Flat footer (never glass): shop links, support contacts, policy and appearance. */
export function Footer() {
  const { t, locale } = useT();
  const { data: s } = useStoreSettings();
  const [policy, setPolicy] = useState(false);
  const [look, setLook] = useState(false);
  const wa = s?.whatsapp_number?.replace(/\D/g, "");
  const returns = locale === "ne" ? s?.policies?.returns_ne || s?.policies?.returns_en : s?.policies?.returns_en;

  return (
    <footer className="mt-12 border-t border-line bg-surface-2 text-ink">
      <div className="mx-auto grid max-w-[75rem] gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 md:grid-cols-3 md:px-8">
        <nav aria-label={t("footer.shop")}>
          <h2 className="m-0 mb-1 text-lg font-bold">{t("footer.shop")}</h2>
          <ul className="m-0 list-none p-0">
            <li><Link to="/shop" className={link}>{t("nav.shop")}</Link></li>
            <li><Link to="/track" className={link}>{t("footer.delivery")}</Link></li>
            <li><Link to="/account" className={link}>{t("nav.account")}</Link></li>
          </ul>
        </nav>
        <section aria-label={t("footer.support")}>
          <h2 className="m-0 mb-1 text-lg font-bold">{t("footer.support")}</h2>
          <ul className="m-0 list-none p-0">
            {wa && <li><a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={link}><MessageCircle aria-hidden size={20} strokeWidth={1.75} />{t("common.contact")}</a></li>}
            {s?.contact_phone && <li><a href={`tel:${s.contact_phone}`} className={link}><Phone aria-hidden size={20} strokeWidth={1.75} />{s.contact_phone}</a></li>}
            {s?.contact_email && <li><a href={`mailto:${s.contact_email}`} className={link}><Mail aria-hidden size={20} strokeWidth={1.75} />{s.contact_email}</a></li>}
            {!wa && !s?.contact_phone && !s?.contact_email && <li className="min-h-12 text-muted">{t("footer.no_contact")}</li>}
          </ul>
        </section>
        <section aria-label={t("footer.more")} className="flex flex-col items-start gap-2">
          <h2 className="m-0 text-lg font-bold">{t("footer.more")}</h2>
          {returns && <Button variant="secondary" onClick={() => setPolicy(true)}>{t("footer.returns")}</Button>}
          <Button variant="secondary" leadingIcon={Palette} onClick={() => setLook(true)}>{t("appearance.title")}</Button>
        </section>
      </div>
      <p className="m-0 border-t border-line px-4 py-4 text-center text-sm text-muted">© {new Date().getFullYear()} {s?.store_name}</p>

      <Dialog open={policy} onOpenChange={setPolicy} title={t("footer.returns")} closeLabel={t("common.close")}>
        <p className="m-0 whitespace-pre-line">{returns}</p>
      </Dialog>
      <Sheet open={look} onOpenChange={setLook} title={t("appearance.title")}><AppearancePanel /></Sheet>
    </footer>
  );
}
