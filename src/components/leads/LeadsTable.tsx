import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, Download, Search, Play, Pause } from "lucide-react";
import { DASHBOARD_CONFIG } from "@/config/dashboard.config";
import { StatusBadge, dispositionBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatDuration } from "@/lib/utils-format";
import type { Run } from "@/types/alphaai";

const RECORDING_BASE = "https://backend.laveric.com/api/v1/public/download/workflow";

function recordingUrl(r: Run): string | null {
  const token = r.public_access_token;
  if (!token) return null;
  return `${RECORDING_BASE}/${token}/recording`;
}

function leadStatus(r: Run) {
  if (!r.is_completed) {
    if (r.disposition === "running")
      return { status: "in_call", label: "In Call", pulse: true };
    return { status: "untouched", label: "Untouched" };
  }
  return dispositionBadge(r.disposition);
}

function exportCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headerSet = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => headerSet.add(k)));
  const headers = Array.from(headerSet);
  const esc = (v: any) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(",")]
    .concat(rows.map((r) => headers.map((h) => esc(r[h])).join(",")))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function LeadsTable({ runs }: { runs: Run[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const pageSize = DASHBOARD_CONFIG.DEFAULT_PAGE_SIZE;

  const dynamicKeys = useMemo(() => {
    const init = new Set<string>();
    const gathered = new Set<string>();
    runs.forEach((r) => {
      Object.keys(r.initial_context ?? {}).forEach((k) => init.add(k));
      Object.keys(r.gathered_context ?? {}).forEach((k) => gathered.add(k));
    });
    const order = DASHBOARD_CONFIG.EXPECTED_CSV_COLUMNS;
    const sortedInit = [
      ...order.filter((k) => init.has(k)),
      ...[...init]
        .filter((k) => !order.includes(k) && k !== "phone_number")
        .sort(),
    ];
    return { sortedInit, gathered: [...gathered].sort() };
  }, [runs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = q
      ? runs.filter((r) =>
          (r.called_number ?? "").toLowerCase().includes(q) ||
          JSON.stringify(r.initial_context ?? {})
            .toLowerCase()
            .includes(q),
        )
      : [...runs];
    rows.sort((a, b) => {
      const av: any = (a as any)[sortKey] ?? a.initial_context?.[sortKey];
      const bv: any = (b as any)[sortKey] ?? b.initial_context?.[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = String(av).localeCompare(String(bv), undefined, {
        numeric: true,
      });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [runs, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(k: string) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  function renderCell(r: Run, key: string, source: "init" | "ai") {
    const v =
      source === "init"
        ? r.initial_context?.[key]
        : r.gathered_context?.[key];
    if (v == null || v === "") return <span className="text-mitadt-text-muted">—</span>;
    if (key === "agreed" || key === "interested") {
      const yes = String(v).toLowerCase() === "true" || v === true || v === "yes";
      return (
        <StatusBadge
          status={yes ? "agreed" : "not_interested"}
          label={yes ? "Yes" : "No"}
        />
      );
    }
    return <span>{String(v)}</span>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-mitadt-border bg-white shadow-sm">
      <div className="flex flex-col items-stretch gap-3 border-b border-mitadt-border p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mitadt-text-muted" />
          <input
            type="search"
            placeholder="Search by phone or context…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-mitadt-border pl-9 pr-3 py-2 text-sm outline-none focus:border-mitadt-purple focus:ring-2 focus:ring-mitadt-purple/20"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            exportCsv(
              "leads.csv",
              filtered.map((r) => ({
                phone: r.called_number,
                status: leadStatus(r).label,
                duration_s: r.call_duration_seconds,
                disposition: r.disposition,
                created_at: r.created_at,
                recording_url: recordingUrl(r) ?? "",
                ...(r.initial_context ?? {}),
                ...Object.fromEntries(
                  Object.entries(r.gathered_context ?? {}).map(([k, v]) => [
                    `ai_${k}`,
                    v,
                  ]),
                ),
              })),
            )
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-mitadt-purple px-3 py-2 text-sm font-semibold text-mitadt-purple hover:bg-mitadt-purple hover:text-white"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-mitadt-bg-secondary text-left text-xs uppercase tracking-wider text-mitadt-text-muted">
            <tr>
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Duration</th>
              <th className="px-3 py-3">Recording</th>
              <th className="px-3 py-3">Recording</th>
              <th
                className="cursor-pointer px-3 py-3"
                onClick={() => toggleSort("created_at")}
              >
                <span className="inline-flex items-center gap-1">
                  Call Time <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              {dynamicKeys.sortedInit.map((k) => (
                <th
                  key={"i-" + k}
                  className="cursor-pointer px-3 py-3"
                  onClick={() => toggleSort(k)}
                >
                  {k.replace(/_/g, " ")}
                </th>
              ))}
              {dynamicKeys.gathered.map((k) => (
                <th
                  key={"a-" + k}
                  className="px-3 py-3 text-mitadt-purple"
                >
                  (AI) {k.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((r, i) => {
              const s = leadStatus(r);
              return (
                <tr
                  key={r.id}
                  className="cursor-pointer border-t border-mitadt-border hover:bg-mitadt-bg-secondary/50"
                >
                  <td className="px-3 py-2 text-xs text-mitadt-text-muted">
                    {(page - 1) * pageSize + i + 1}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      to="/dashboard/calls/$runId"
                      params={{ runId: String(r.id) }}
                      className="font-mono text-xs text-mitadt-purple hover:underline"
                    >
                      {r.called_number ??
                        (r.initial_context?.phone_number as string) ??
                        "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      status={s.status}
                      label={s.label}
                      pulse={"pulse" in s ? (s as any).pulse : false}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {formatDuration(r.call_duration_seconds)}
                  </td>
                  <td className="px-3 py-2">
                    {recordingUrl(r) ? (
                      <a
                        href={recordingUrl(r)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded p-1 text-mitadt-purple hover:bg-mitadt-purple/10"
                        title="Play recording"
                      >
                        <Play className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-mitadt-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {formatDate(r.created_at)}
                  </td>
                  {dynamicKeys.sortedInit.map((k) => (
                    <td key={"i-" + k} className="px-3 py-2">
                      {renderCell(r, k, "init")}
                    </td>
                  ))}
                  {dynamicKeys.gathered.map((k) => (
                    <td key={"a-" + k} className="px-3 py-2">
                      {renderCell(r, k, "ai")}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paged.length === 0 && (
              <tr>
                <td
                  colSpan={5 + dynamicKeys.sortedInit.length + dynamicKeys.gathered.length}
                  className="px-3 py-12 text-center text-sm text-mitadt-text-muted"
                >
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-mitadt-border px-4 py-3 text-xs text-mitadt-text-muted">
        <span>
          Showing {(page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, filtered.length)} of {filtered.length} leads
        </span>
        <div className="flex gap-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-mitadt-border px-2 py-1 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-2 py-1">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-mitadt-border px-2 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}