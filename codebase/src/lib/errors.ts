import { ClientResponseError } from "pocketbase";

/** Turns a PocketBase error into a readable, user-facing message. */
export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ClientResponseError) {
    if (err.status === 0) return "Cannot reach the server. Check your connection.";
    const data = err.response?.data as Record<string, { message?: string }> | undefined;
    if (data && Object.keys(data).length) {
      const [field, detail] = Object.entries(data)[0];
      if (detail?.message) return `${humanize(field)}: ${detail.message}`;
    }
    if (err.status === 403) return "You don't have permission to do that.";
    if (err.status === 404) return "Not found, or you don't have access.";
    return err.response?.message || err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

function humanize(field: string) {
  return field.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function isAbort(err: unknown) {
  return err instanceof ClientResponseError && err.isAbort;
}
