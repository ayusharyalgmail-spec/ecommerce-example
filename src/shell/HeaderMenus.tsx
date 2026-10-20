import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, ChevronDown, IconButton, LogIn, LogOut, Popover, User, cn } from "@/ui";
import { useAuth } from "@/lib/auth";
import { useT, pick } from "@/lib/i18n";
import { useCategories } from "@/lib/queries";
import { AppearancePanel } from "./AppearancePanel";

export function CategoriesMenu() {
  const { t, locale } = useT();
  const { data } = useCategories();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen} align="start" trigger={<Button variant="ghost" trailingIcon={ChevronDown}>{t("home.categories")}</Button>}>
      <ul className="m-0 grid min-w-56 list-none gap-1 p-0">
        <li><Link to="/shop" onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-md px-3 font-semibold text-ink no-underline">{t("shop.all")}</Link></li>
        {data?.map((c) => (
          <li key={c.id}><Link to={`/shop?category=${c.slug}`} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-md px-3 text-ink no-underline">{pick(locale, c.name_en, c.name_ne)}</Link></li>
        ))}
      </ul>
    </Popover>
  );
}

export function AccountMenu() {
  const { t } = useT();
  const { user, isStaff, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const item = "flex min-h-12 items-center gap-2 rounded-md px-3 font-semibold text-ink no-underline";
  const close = () => setOpen(false);
  return (
    <Popover open={open} onOpenChange={setOpen} align="end" className="w-80" trigger={<IconButton icon={User} label={t("shell.account_menu")} />}>
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

