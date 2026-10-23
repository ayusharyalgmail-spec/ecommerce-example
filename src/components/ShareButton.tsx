import React, { useState } from "react";
import { Popover, toast } from "@/ui";
import { shareLink, isNativeShareDevice, copyText } from "@/lib/share";
import { useT } from "@/lib/i18n";

type ShareData = { title: string; text: string; url: string };

// Brand-color SVG icons – all aria-hidden; the wrapping <button> carries the label.
function WhatsAppIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="#25D366" width={28} height={28}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="#1877F2" width={28} height={28}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="#26A5E4" width={28} height={28}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" width={28} height={28}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={28} height={28}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

type ShareButtonProps = {
  data: ShareData;
  /** The trigger element rendered as a button */
  trigger: React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>;
};

/** On Android/iOS: fires the OS share sheet. On desktop: opens a popover with brand-icon buttons. */
export function ShareButton({ data, trigger }: ShareButtonProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  const handleNativeShare = async () => {
    const r = await shareLink(data);
    if (r === "copied") toast.success(t("share.copied"));
    else if (r === "failed") toast.error(t("share.failed"));
  };

  const url = encodeURIComponent(data.url);
  const text = encodeURIComponent(data.text);

  const copyAndClose = async () => {
    const ok = await copyText(data.url);
    setOpen(false);
    if (ok) toast.success(t("share.copied"));
    else toast.error(t("share.failed"));
  };

  // On mobile: clone the trigger with an onClick for native share — Popover never opens
  if (isNativeShareDevice()) {
    return <>{React.cloneElement(trigger, { onClick: handleNativeShare })}</>;
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      trigger={trigger}
      className="w-72"
    >
      <p className="m-0 mb-3 text-sm font-semibold text-muted">{t("share.share_via")}</p>
      <div className="grid grid-cols-4 gap-3">
        <a
          href={`https://wa.me/?text=${text}%20${url}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-surface-2 focus-visible:outline-2"
          aria-label="WhatsApp"
        >
          <WhatsAppIcon />
          <span aria-hidden>WhatsApp</span>
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${url}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-surface-2 focus-visible:outline-2"
          aria-label="Facebook"
        >
          <FacebookIcon />
          <span aria-hidden>Facebook</span>
        </a>
        <a
          href={`https://t.me/share/url?url=${url}&text=${text}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-surface-2 focus-visible:outline-2"
          aria-label="Telegram"
        >
          <TelegramIcon />
          <span aria-hidden>Telegram</span>
        </a>
        <a
          href={`https://x.com/intent/tweet?text=${text}&url=${url}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-surface-2 focus-visible:outline-2"
          aria-label="X (Twitter)"
        >
          <XIcon />
          <span aria-hidden>X</span>
        </a>
      </div>
      <div className="mt-3 border-t border-line pt-3">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
          <span className="flex-1 truncate text-muted">{data.url}</span>
          <button
            type="button"
            onClick={copyAndClose}
            aria-label={t("share.copy_link")}
            className="shrink-0 rounded p-1 hover:bg-surface-3 focus-visible:outline-2"
          >
            <CopyIcon />
          </button>
        </div>
      </div>
    </Popover>
  );
}
