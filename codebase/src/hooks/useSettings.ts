import { useContext } from "react";
import { SettingsContext } from "../context/SettingsContext";
import { fileUrl } from "../services/files";

export function useSettings() {
  const { settings, refresh } = useContext(SettingsContext);
  return {
    settings,
    refresh,
    siteName: settings?.site_name || "Brilliant Edu",
    logoUrl: settings?.logo ? fileUrl(settings, settings.logo) : "",
    selfEnrollmentEnabled: settings?.allow_self_enrollment !== false,
  };
}
