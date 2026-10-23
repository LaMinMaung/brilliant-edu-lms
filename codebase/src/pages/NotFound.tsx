import { Link } from "react-router-dom";
import { BrandMark } from "../components/layout/Brand";

export default function NotFound() {
  return (
    <div className="ruled flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="rounded-lg border border-rule bg-paper px-10 py-12 shadow-sm">
        <BrandMark className="mx-auto size-10" />
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-ink-3">Error 404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          This page is <span className="marker">not in the notebook</span>
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-ink-2">The address may be mistyped, or the page was moved or removed.</p>
        <Link to="/" className="mt-7 inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-medium text-paper hover:bg-night-2">
          Back to home
        </Link>
      </div>
    </div>
  );
}
