import { useState } from "react";
import { Inbox } from "lucide-react";
import type { Assignment } from "../../lib/types-phase2";
import { useLoader } from "../../hooks/useLoader";
import { displayName, formatDateTime } from "../../lib/format";
import { listSubmissions } from "../../services/assignments";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Select } from "../ui/Field";
import { Table, Td, Th } from "../ui/Table";
import { EmptyState, ErrorState, Loading } from "../ui/States";
import { GradeSubmissionModal } from "./GradeSubmissionModal";

/** Latest submission per student, with filters and the grading modal. */
export function SubmissionsPanel({ assignment }: { assignment: Assignment }) {
  const list = useLoader(() => listSubmissions(assignment.id), [assignment.id]);
  const [filter, setFilter] = useState<"all" | "ungraded" | "late">("all");
  const [open, setOpen] = useState<string | null>(null);

  if (list.error) return <ErrorState message={list.error} onRetry={list.reload} />;
  if (!list.data) return <Loading />;
  const latest = list.data.filter((s) => s.is_latest);
  const rows = latest.filter((s) => (filter === "ungraded" ? s.status !== "graded" : filter === "late" ? s.is_late : true));
  if (!latest.length) return <EmptyState icon={<Inbox className="size-5" />} title="No submissions yet" message="Submissions appear here as students hand in their work." />;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-2">{latest.length} student{latest.length === 1 ? "" : "s"} submitted · {latest.filter((s) => s.status !== "graded").length} to grade</p>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="w-auto" aria-label="Filter submissions">
          <option value="all">All</option>
          <option value="ungraded">Needs grading</option>
          <option value="late">Late</option>
        </Select>
      </div>
      <Table>
        <thead><tr><Th>Student</Th><Th>Submitted</Th><Th>Version</Th><Th>Status</Th><Th>Grade</Th></tr></thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="cursor-pointer hover:bg-paper-2" onClick={() => setOpen(s.id)}>
              <Td>
                <button className="flex items-center gap-3 text-left" onClick={(e) => { e.stopPropagation(); setOpen(s.id); }}>
                  <Avatar user={s.expand?.user} size="xs" /><span className="font-medium hover:underline">{displayName(s.expand?.user)}</span>
                </button>
              </Td>
              <Td className="font-mono text-xs text-ink-2">{formatDateTime(s.submitted_at)} {s.is_late && <Badge tone="danger">Late</Badge>}</Td>
              <Td className="font-mono text-xs">#{s.number}</Td>
              <Td>{s.status === "graded" ? <Badge tone="success">Graded</Badge> : <Badge tone="warning">To grade</Badge>}</Td>
              <Td className="font-mono text-xs">{s.status === "graded" ? `${s.grade} / ${assignment.max_marks}` : "—"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <GradeSubmissionModal submissionId={open} onClose={() => setOpen(null)} onGraded={() => list.reload()} />
    </>
  );
}
