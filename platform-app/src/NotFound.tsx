import { Link } from "react-router-dom";
import { buttonStyles } from "@/ui";
import { useT } from "@/lib/i18n";

export function NotFound() {
  const { t } = useT();
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="m-0 text-2xl font-bold text-ink">{t("notfound.title")}</h1>
      <p className="m-0 text-muted">{t("notfound.description")}</p>
      <Link to="/network" className={buttonStyles()}>{t("nav.home")}</Link>
    </main>
  );
}
