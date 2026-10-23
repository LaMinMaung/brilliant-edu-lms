export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 180);
}

function toDate(value?: string) {
  if (!value) return null;
  const d = new Date(value.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

/** Locale + timezone come from site settings (Settings → Locale). */
const prefs: { locale?: string; timeZone?: string } = {};
export function setFormatPrefs(locale?: string, timeZone?: string) {
  prefs.locale = locale || undefined;
  try {
    prefs.timeZone = timeZone ? new Intl.DateTimeFormat("en", { timeZone }).resolvedOptions().timeZone : undefined;
  } catch {
    prefs.timeZone = undefined;
  }
}

export function formatDate(value?: string) {
  const d = toDate(value);
  return d ? d.toLocaleDateString(prefs.locale, { year: "numeric", month: "short", day: "numeric", timeZone: prefs.timeZone }) : "—";
}

export function formatDateTime(value?: string) {
  const d = toDate(value);
  return d
    ? d.toLocaleString(prefs.locale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: prefs.timeZone })
    : "—";
}

/** PocketBase date string → value for <input type="datetime-local"> (local time). */
export function toInputDateTime(value?: string) {
  const d = toDate(value);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value → PocketBase UTC date string ("" clears the field). */
export function fromInputDateTime(value: string) {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString().replace("T", " ");
}

export function toMillis(value?: string) {
  return toDate(value)?.getTime() ?? 0;
}

export function isPast(value?: string) {
  const t = toMillis(value);
  return t > 0 && t < Date.now();
}

/** "in 3 days", "2 hours ago" style description of a due date. */
export function dueLabel(value?: string) {
  const t = toMillis(value);
  if (!t) return "No due date";
  const diff = t - Date.now();
  const abs = Math.abs(diff);
  const h = Math.round(abs / 3600000);
  const span = h < 1 ? `${Math.max(1, Math.round(abs / 60000))} min` : h < 48 ? `${h} h` : `${Math.round(h / 24)} days`;
  return diff >= 0 ? `Due in ${span}` : `Was due ${span} ago`;
}

export function timeAgo(value?: string) {
  const d = toDate(value);
  if (!d) return "never";
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function initials(name?: string, fallback = "?") {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function displayName(u?: { name?: string; email?: string } | null) {
  return u?.name || u?.email || "Unknown user";
}

export const LEVEL_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all_levels: "All levels",
};

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function fileExtension(name: string) {
  const clean = name.replace(/_[a-z0-9]{10}(\.[^.]+)$/i, "$1");
  const idx = clean.lastIndexOf(".");
  return idx >= 0 ? clean.slice(idx + 1).toUpperCase() : "FILE";
}
