import { useCallback, useState } from "react";
import { ScrollText } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Field";
import { SearchInput } from "../../components/ui/SearchInput";
import { Pagination, Table, Td, Th } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import { useLoader } from "../../hooks/useLoader";
import { displayName, formatDateTime } from "../../lib/format";
import { listActivity } from "../../services/stats";

const AREAS = [
  { value: "", label: "All activity" },
  { value: "auth", label: "Sign-ins" },
  { value: "user", label: "Users" },
  { value: "course", label: "Courses" },
  { value: "enrollment", label: "Enrollments" },
  { value: "lesson", label: "Lesson completions" },
  { value: "category", label: "Categories" },
  { value: "role", label: "Roles" },
  { value: "settings", label: "Settings" },
];

export default function ActivityLogPage() {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [page, setPage] = useState(1);
  const list = useLoader(() => listActivity({ search, area, page }), [search, area, page]);
  const onSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  return (
    <>
      <PageHeader crumbs={[{ label: "Settings", to: "/admin/settings" }, { label: "Activity log" }]} title="Activity log"
        description="An append-only record of sign-ins, account changes, course changes, enrollments and lesson completions. Entries are written by the server and can't be edited." />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={search} onChange={onSearch} placeholder="Search description or person" />
        <Select value={area} onChange={(e) => { setArea(e.target.value); setPage(1); }} className="w-auto min-w-44" aria-label="Filter by area">
          {AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </Select>
      </div>
      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading && !list.data ? <Loading /> : list.data?.items.length ? (
        <>
          <Table>
            <thead><tr><Th className="w-44">When</Th><Th>Who</Th><Th>Event</Th><Th>Details</Th></tr></thead>
            <tbody>
              {list.data.items.map((l) => (
                <tr key={l.id} className="hover:bg-paper-2">
                  <Td className="whitespace-nowrap font-mono text-xs text-ink-2">{formatDateTime(l.created)}</Td>
                  <Td className="whitespace-nowrap">{l.actor ? displayName(l.expand?.actor) : <span className="text-ink-3">System</span>}</Td>
                  <Td><Badge tone={l.action.endsWith("deleted") || l.action.endsWith("deactivated") ? "danger" : l.action.includes("published") || l.action.includes("completed") ? "success" : "neutral"}>{l.action}</Badge></Td>
                  <Td className="text-ink-2">{l.description}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.totalItems} onPage={setPage} />
        </>
      ) : <EmptyState icon={<ScrollText className="size-5" />} title="No matching activity" message="Try a different filter." />}
    </>
  );
}
