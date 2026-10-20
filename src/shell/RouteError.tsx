import { useState } from "react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button, buttonStyles, Check } from "@/ui";
import { useT } from "@/lib/i18n";
import { BasketIllustration } from "./Illustration";

/** Global error boundary: a calm flat screen with a reference id the vendor can ask for, never a stack trace. */
export function RouteError() {
  const error = useRouteError();
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const status = isRouteErrorResponse(error) ? error.status : null;
  const detail = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : String(error);
  const [ref] = useState(() => `req-${Math.random().toString(36).slice(2, 10)}`);
  console.error(`[${ref}]`, error);

  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <BasketIllustration broken />
      <h1 className="m-0 text-2xl font-bold text-ink">{status === 404 ? t("notfound.title") : t("error.title")}</h1>
      <p className="m-0 text-muted">{status === 404 ? t("notfound.description") : t("error.description")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => window.location.reload()}>{t("error.retry")}</Button>
        <Link to="/" className={buttonStyles({ variant: "secondary" })}>{t("nav.home")}</Link>
      </div>
      <p className="m-0 text-sm text-muted">
        {t("error.reference")}: <code>{ref}</code>
        {" "}
        <Button variant="ghost" size="sm" leadingIcon={copied ? Check : undefined}
          onClick={async () => { try { await navigator.clipboard.writeText(`${ref}: ${detail}`); setCopied(true); } catch { /* clipboard blocked */ } }}>
          {copied ? t("common.saved") : t("error.copy")}
        </Button>
      </p>
    </main>
  );
}
