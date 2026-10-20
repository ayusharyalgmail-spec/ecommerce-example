import { useId } from "react";

/** Flat geometric spot illustration for 404 and error states: a basket in brand, indigo and glacier blocks. Decorative. */
export function BasketIllustration({ broken = false, size = 160 }: { broken?: boolean; size?: number }) {
  const id = useId();
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 160 160" focusable="false">
      <defs><clipPath id={id}><rect x="0" y="0" width="160" height="160" rx="32" /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <rect width="160" height="160" fill="var(--brand-tint)" />
        <circle cx="132" cy="30" r="22" fill="var(--glacier)" opacity=".55" />
        <rect x="-10" y="120" width="190" height="50" fill="var(--surface-2)" />
        <path d="M44 70h72l-9 52a8 8 0 0 1-8 7H61a8 8 0 0 1-8-7z" fill="var(--ink)" />
        <path d="M58 70c0-17 9-30 22-30s22 13 22 30" fill="none" stroke="var(--ink)" strokeWidth="8" strokeLinecap="round" />
        <rect x="40" y="62" width="80" height="12" rx="6" fill="var(--brand)" />
        {broken ? <path d="M64 92l32 24M96 92L64 116" stroke="var(--brand)" strokeWidth="7" strokeLinecap="round" /> : <circle cx="80" cy="100" r="9" fill="var(--brand)" />}
      </g>
    </svg>
  );
}
