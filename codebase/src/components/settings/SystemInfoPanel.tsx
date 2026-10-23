import { Link } from "react-router-dom";
import { ScrollText, Server } from "lucide-react";
import { useLoader } from "../../hooks/useLoader";
import { formatDateTime } from "../../lib/format";
import { getSystemInfo } from "../../services/settings";
import { Panel } from "../ui/Panel";
import { Badge } from "../ui/Badge";
import { ErrorState, Loading } from "../ui/States";

const COUNT_LABELS: Record<string, string> = {
  users: "Users", roles: "Roles", categories: "Categories", courses: "Courses", course_sections: "Sections",
  activities: "Lessons", materials: "Materials", enrollments: "Enrollments", activity_progress: "Progress records", activity_log: "Log entries",
};

export function SystemInfoPanel() {
  const system = useLoader(getSystemInfo, []);
  return (
    <Panel title={<span className="flex items-center gap-2"><Server className="size-4" aria-hidden /> System information</span>}
      actions={<Link to="/admin/activity" className="flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"><ScrollText className="size-4" aria-hidden /> Activity log</Link>}>
      {system.error ? <ErrorState message={system.error} onRetry={system.reload} /> : !system.data ? <Loading /> : (
        <div className="flex flex-col gap-4 text-sm">
          <dl className="flex flex-col gap-2">
            <Row k="Application" v={system.data.appName} />
            <Row k="App URL" v={<span className="break-all font-mono text-xs">{system.data.appURL || "—"}</span>} />
            <Row k="Outgoing email" v={<Badge tone={system.data.smtpEnabled ? "success" : "warning"}>{system.data.smtpEnabled ? "Configured" : "Not configured"}</Badge>} />
            <Row k="Server time" v={<span className="font-mono text-xs">{formatDateTime(system.data.serverTime)}</span>} />
          </dl>
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Records</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {Object.entries(system.data.counts).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-rule pb-1">
                  <dt className="text-ink-2">{COUNT_LABELS[k] || k}</dt>
                  <dd className="font-mono tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </Panel>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-rule pb-2">
      <dt className="text-ink-3">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
