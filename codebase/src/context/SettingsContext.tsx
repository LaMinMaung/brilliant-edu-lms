import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";
import type { SiteSettings } from "../lib/types";
import { setFormatPrefs } from "../lib/format";
import { fileUrl } from "../services/files";
import { getSettings } from "../services/settings";

interface SettingsValue {
  settings: SiteSettings | null;
  refresh: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsValue>({ settings: null, refresh: async () => {} });

function applyDocumentSettings(s: SiteSettings) {
  setFormatPrefs(s.default_language, s.timezone);
  document.documentElement.lang = s.default_language || "en";
  if (s.site_name) document.title = `${s.site_name} LMS`;
  const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (link) link.href = s.favicon ? fileUrl(s, s.favicon) : "/favicon.png";
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const s = await getSettings();
    applyDocumentSettings(s);
    setSettings(s);
  }, []);

  useEffect(() => {
    load()
      .catch((err) => console.error("Failed to load site settings", err))
      .finally(() => setReady(true));
  }, [load]);

  // Settings are tiny; wait for them so branding, locale and timezone are correct on first paint.
  if (!ready) return null;
  return <SettingsContext.Provider value={{ settings, refresh: load }}>{children}</SettingsContext.Provider>;
}
