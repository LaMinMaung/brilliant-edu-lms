import type { ReactNode } from "react";
import { Brand } from "../layout/Brand";
import { useSettings } from "../../hooks/useSettings";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const { settings, siteName } = useSettings();
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(480px,560px)]">
      <aside className="relative hidden overflow-hidden bg-night p-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <Brand tone="light" />
        <div className="max-w-md">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/50">{siteName} · Learning platform</p>
          <p className="mt-5 font-display text-[2.6rem] font-semibold leading-[1.1]">
            Every course, lesson and milestone, <span className="marker text-ink">kept in one place.</span>
          </p>
          <p className="mt-5 text-paper/70">{settings?.tagline || "Learning, well organised."}</p>
        </div>
        <div
          className="pointer-events-none absolute -bottom-10 -right-10 h-72 w-72 rotate-6 rounded-lg opacity-[0.08]"
          style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 23px, var(--color-paper) 23px 24px)" }}
          aria-hidden
        />
        <p className="font-mono text-xs text-paper/40">{settings?.footer_text || `© ${new Date().getFullYear()} ${siteName}`}</p>
      </aside>
      <main className="flex flex-col justify-center px-5 py-10 sm:px-12">
        <div className="mb-10 lg:hidden"><Brand /></div>
        <div className="mx-auto w-full max-w-sm animate-rise">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-ink-2">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 border-t border-rule pt-5 text-sm text-ink-2">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-md border border-brick/25 bg-brick-soft px-3 py-2.5 text-sm text-brick" role="alert">
      {message}
    </div>
  );
}
