import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Brand } from "./Brand";
import { VerifyBanner } from "./VerifyBanner";
import { NotificationBell } from "../notifications/NotificationBell";

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-paper lg:pl-64">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:bg-marker focus:px-3 focus:py-2">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-rule bg-paper/95 px-4 backdrop-blur lg:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          <NotificationBell tone="dark" />
          <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-paper-3" aria-label="Open navigation" aria-expanded={open}>
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="animate-fade absolute inset-0 bg-night/50" onClick={() => setOpen(false)} aria-hidden />
          <div className="animate-rise absolute inset-y-0 left-0 w-[min(82vw,300px)] shadow-2xl">
            <Sidebar onNavigate={() => setOpen(false)} />
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded p-1 text-paper/70 hover:text-paper" aria-label="Close navigation">
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <VerifyBanner />
      <main id="main" className="mx-auto w-full max-w-[1240px] px-4 py-7 sm:px-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
