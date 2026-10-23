import { Link } from "react-router-dom";
import { useSettings } from "../../hooks/useSettings";
import { cx } from "../../lib/format";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cx("size-8", className)} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="6" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2" />
      <path d="M6 21.5 L26 19" stroke="var(--color-marker)" strokeWidth="6" strokeLinecap="round" />
      <path d="M11 8h6.2c2.7 0 4.3 1.4 4.3 3.5 0 1.5-.9 2.6-2.3 3 1.8.3 3 1.6 3 3.4 0 2.5-1.9 4.1-4.8 4.1H11V8Zm3 5.8h2.7c1.2 0 1.9-.6 1.9-1.6s-.7-1.6-1.9-1.6H14v3.2Zm0 6h3c1.3 0 2.1-.7 2.1-1.8s-.8-1.8-2.1-1.8h-3v3.6Z" fill="var(--color-ink)" />
    </svg>
  );
}

export function Brand({ to = "/", tone = "dark" }: { to?: string; tone?: "dark" | "light" }) {
  const { siteName, logoUrl } = useSettings();
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label={`${siteName} home`}>
      {logoUrl ? (
        <img src={logoUrl} alt="" className={cx("h-8 w-auto max-w-[120px] object-contain", tone === "light" && "rounded bg-paper p-0.5")} />
      ) : (
        <BrandMark />
      )}
      <span className={cx("font-display text-[1.15rem] font-semibold tracking-tight", tone === "light" ? "text-paper" : "text-ink")}>
        {siteName}
      </span>
    </Link>
  );
}
