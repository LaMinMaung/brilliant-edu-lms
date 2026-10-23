import { useState } from "react";
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import { errorMessage } from "../../lib/errors";
import { cx } from "../../lib/format";
import { runSelfTest, type SelfTestResult } from "../../services/settings";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

/** Runs the Phase 1 acceptance workflow on the server against real records, then cleans up. */
export function SelfTestPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SelfTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await runSelfTest());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const groups = result ? Array.from(new Set(result.results.map((r) => r.group))) : [];

  return (
    <Panel title={<span className="flex items-center gap-2"><ClipboardCheck className="size-4" aria-hidden /> Acceptance self-test</span>}
      description="Creates a temporary admin, instructor, student and course, runs the full workflow through the real API and access rules, then deletes everything it created."
      actions={<Button size="sm" onClick={run} loading={busy}>{result ? "Run again" : "Run self-test"}</Button>}>
      {error && <p className="text-sm text-brick" role="alert">{error}</p>}
      {!result && !error && <p className="text-sm text-ink-3">{busy ? "Running… this takes a few seconds." : "Run it after deployment or upgrades to confirm the platform works end to end."}</p>}
      {result && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={result.ok ? "success" : "danger"}>{result.ok ? "All checks passed" : "Checks failed"}</Badge>
            <span className="font-mono text-xs text-ink-3">{result.passed}/{result.total} passed · {(result.durationMs / 1000).toFixed(1)}s</span>
          </div>
          {groups.map((g) => (
            <div key={g}>
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">{g}</p>
              <ul className="flex flex-col">
                {result.results.filter((r) => r.group === g).map((r, i) => (
                  <li key={i} className={cx("flex items-start gap-2 border-b border-rule py-1.5 text-sm last:border-0", !r.ok && "text-brick")}>
                    {r.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-moss" aria-label="Passed" /> : <XCircle className="mt-0.5 size-4 shrink-0" aria-label="Failed" />}
                    <span className="flex-1">{r.step}{!r.ok && r.detail && <span className="block font-mono text-xs">{r.detail}</span>}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
