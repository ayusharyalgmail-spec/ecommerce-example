import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, ChevronDown, LogIn, LogOut, Popover, User, cn } from "@/ui";
import { useAuth } from "@/lib/auth";
import { useT, pick } from "@/lib/i18n";
import { useCategories } from "@/lib/queries";
import { categoryIcon } from "@/catalog/categoryIcon";
import { AppearancePanel } from "./AppearancePanel";

const row = "flex min-h-11 items-center gap-2.5 rounded-md px-3 text-ink no-underline transition-colors duration-[var(--duration-1)] hover-fine:hover:bg-surface-2";

export function CategoriesMenu() {
  const { t, locale } = useT();
  const { data } = useCategories();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen} align="start" trigger={<Button variant="ghost" trailingIcon={ChevronDown}>{t("nav.categories")}</Button>}>
      <ul className="m-0 grid min-w-64 list-none gap-0.5 p-0 sm:grid-cols-2 sm:min-w-[30rem]">
        <li className="sm:col-span-2"><Link to="/shop" onClick={() => setOpen(false)} className={cn(row, "font-bold text-brand-strong")}>{t("shop.all")}</Link></li>
        {data?.map((c) => {
          const Icon = categoryIcon(c.slug);
          return <li key={c.id}><Link to={`/shop?category=${c.slug}`} onClick={() => setOpen(false)} className={row}><Icon aria-hidden size={18} strokeWidth={1.75} className="shrink-0 text-brand-strong" />{pick(locale, c.name_en, c.name_ne)}</Link></li>;
        })}
      </ul>
    </Popover>
  );
}

export function AccountMenu() {
  const { t } = useT();
  const { user, isStaff, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const item = "flex min-h-12 items-center gap-2 rounded-md px-3 font-semibold text-ink no-underline transition-colors duration-[var(--duration-1)] hover-fine:hover:bg-surface-2";
  const close = () => setOpen(false);
  return (
    <Popover open={open} onOpenChange={setOpen} align="end" className="w-80" trigger={<button type="button" aria-label={t("shell.account_menu")} className="flex size-11 items-center justify-center rounded-full bg-ink text-sm font-bold text-[var(--surface)] transition-transform active:scale-95">{user?.email?.[0]?.toUpperCase() ?? <User aria-hidden size={20} />}</button>}>
      <div className="space-y-3">
        {user ? (
          <>
            <p className="m-0 truncate px-3 text-sm font-semibold">{user.email}</p>
            <ul className="m-0 grid list-none gap-1 p-0">
              <li><Link to="/account" onClick={close} className={item}>{t("nav.account")}</Link></li>
              <li><Link to="/account/wishlist" onClick={close} className={item}>{t("wish.title")}</Link></li>
              <li><Link to="/account/addresses" onClick={close} className={item}>{t("addr.title")}</Link></li>
              {isStaff && <li><Link to="/admin" onClick={close} className={item}>{t("nav.admin")}</Link></li>}
              <li><button type="button" onClick={() => { close(); void signOut(); }} className={cn(item, "w-full bg-transparent")}><LogOut aria-hidden size={20} strokeWidth={1.75} />{t("nav.signout")}</button></li>
            </ul>
          </>
        ) : (
          <Link to="/login" onClick={close} className={item}><LogIn aria-hidden size={20} strokeWidth={1.75} />{t("nav.signin")}</Link>
        )}
        <hr className="m-0 border-0 border-t border-[var(--line)]" />
        <AppearancePanel />
      </div>
    </Popover>
  );
}

