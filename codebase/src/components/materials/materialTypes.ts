export const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "odp", "ods", "rtf", "txt", "csv",
  "png", "jpg", "jpeg", "gif", "webp", "zip",
];

export const SERVER_MAX_MB = 50;

export function validateUpload(file: File, maxMb: number): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) return `"${file.name}" is not an allowed file type.`;
  const limit = Math.min(maxMb || SERVER_MAX_MB, SERVER_MAX_MB);
  if (file.size > limit * 1024 * 1024) return `"${file.name}" exceeds the ${limit} MB limit.`;
  return null;
}
