import { Link } from "react-router-dom";
import { buttonStyles } from "@/ui";
import { useT } from "@/lib/i18n";
import { BasketIllustration } from "./Illustration";
import { useTitle } from "@/components/ui";

export function NotFound() {
  const { t } = useT();
  useTitle(t("notfound.title"));
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <BasketIllustration />
      <h1 className="m-0 text-2xl font-bold text-ink">{t("notfound.title")}</h1>
      <p className="m-0 text-muted">{t("notfound.description")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link to="/" className={buttonStyles()}>{t("nav.home")}</Link>
        <Link to="/shop" className={buttonStyles({ variant: "secondary" })}>{t("nav.shop")}</Link>
      </div>
    </main>
  );
}
