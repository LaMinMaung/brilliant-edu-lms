import type { RecordModel } from "pocketbase";
import pb from "../lib/pocketbase";

export function fileUrl(record: RecordModel, filename: string, thumb?: string) {
  if (!filename) return "";
  return pb.files.getURL(record, filename, thumb ? { thumb } : undefined);
}

/** Protected files need a short-lived token; the server checks the record's view rule. */
export async function protectedFileUrl(record: RecordModel, filename: string, download = false) {
  const token = await pb.files.getToken({ requestKey: null });
  return pb.files.getURL(record, filename, { token, download });
}
