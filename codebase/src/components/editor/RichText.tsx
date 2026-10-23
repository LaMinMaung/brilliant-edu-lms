import { useMemo } from "react";
import { sanitizeHtml } from "../../lib/sanitize";
import { cx } from "../../lib/format";

/** Renders stored HTML only after sanitizing it. */
export function RichText({ html, className }: { html: string; className?: string }) {
  const clean = useMemo(() => sanitizeHtml(html), [html]);
  if (!clean.trim()) return null;
  return <div className={cx("prose-lms", className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}
