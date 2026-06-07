import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, Download, Search, Play, X, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { DASHBOARD_CONFIG } from "@/config/dashboard.config";
import { StatusBadge, dispositionBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatDuration } from "@/lib/utils-format";
import { getRun, getTranscript } from "@/lib/alphaai.functions";
import type { Run } from "@/types/alphaai";

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

interface RunModalProps {
  run: Run;
  onClose: () => void;
}

function RunModal({ run, onClose }: RunModalProps) {
  const getRunFn = useServerFn(getRun);
  const getTrFn = useServerFn(getTranscript);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<Run | null>(null);
  const [transcript, setTranscript] = useState<any[] | null>(null);

  const customerName = (run.initial_context?.customer_name as string) ?? "Unknown";
  const phone = run.called_number ?? (run.initial_context?.phone_number as string) ?? "—";

  // Fetch run details and transcript
  useMemo(() => {
    let cancelled = false;
    async function fetchRun() {
      try {
        const result = await getRunFn({
          data: { runId: run.id, workflowId: run.workflow_id },
        });
        if (cancelled) return;
        setRunDetails(result as Run);

        // Fetch transcript if available
        if (result.public_access_token) {
          try {
            const trResult = await getTrFn({ data: { token: result.public_access_token } });
            const messages = Array.isArray(trResult?.transcript)
              ? trResult.transcript
              : Array.isArray(trResult?.messages)
              ? trResult.messages
              : [];

            if (!cancelled && messages.length > 0) {
              setTranscript(messages);
            }
          } catch (e) {
            console.error("Failed to load transcript:", e);
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load run details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRun();
    return () => { cancelled = true; };
  }, [run.id, run.workflow_id]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-xl border border-mitadt-border bg-white p-8">
          <Loader2 className="h-8 w-8 animate-spin text-mitadt-purple" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-xl border border-mitadt-border bg-white p-8 max-w-md">
          <h2 className="font-semibold text-mitadt-text-primary">Error</h2>
          <p className="text-mitadt-text-muted mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-w-3xl max-h-[80vh] w-full mx-4 rounded-xl border border-mitadt-border bg-white shadow-lg overflow-hidden">
        <div className="p-6 border-b border-mitadt-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-mitadt-purple-dark">{customerName}</span>
              <span className="text-mitadt-text-muted">·</span>
              <span className="font-mono text-mitadt-text-muted">{phone}</span>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1 text-mitadt-text-muted hover:bg-mitadt-bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-200px)]">
          {/* Section 1: Audio Player */}
          {runDetails?.recording_public_url && (
            <div>
              <audio controls className="w-full" src={runDetails.recording_public_url} />
            </div>
          )}

          {/* Section 2: Transcript */}
          {transcript && transcript.length > 0 ? (
            <div>
              <h3 className="font-semibold text-mitadt-text-primary mb-3">Transcript</h3>
              <div className="space-y-2">
                {transcript.map((msg, i) => {
                  const role = msg.role || msg.speaker || "agent";
                  const content = msg.text || msg.content || msg.message || "";
                  const isAgent = role === "agent";
                  return (
                    <div
                      key={i}
                      className={`text-xs max-w-[80%] ${
                        isAgent
                          ? "bg-mitadt-bg-secondary text-mitadt-text-primary ml-auto rounded-lg px-3 py-2"
                          : "bg-mitadt-purple text-white mr-auto rounded-lg px-3 py-2"
                      }`}
                    >
                      <p className="mb-1">{content}</p>
                      {msg.timestamp && (
                        <p className="text-[0.75rem] opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-mitadt-text-muted">
              {runDetails?.transcript_public_url ? "No transcript available" : "Transcript not available"}
            </div>
          )}
        </div>

        {/* Section 3: Action Buttons */}
        <div className="border-t border-mitadt-border p-4 flex gap-3">
          {runDetails?.recording_public_url && (
            <a
              href={runDetails.recording_public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-mitadt-purple px-4 py-2 text-sm font-semibold text-white hover:bg-mitadt-purple-dark"
            >
              <Download className="h-4 w-4" /> Download Recording
            </a>
          )}
          {runDetails?.transcript_public_url && (
            <a
              href={runDetails.transcript_public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-mitadt-border px-4 py-2 text-sm font-semibold text-mitadt-text-primary hover:bg-mitadt-bg-secondary"
            >
              <Download className="h-4 w-4" /> Download Transcript
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function LeadsTable({ runs }: { runs: Run[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [audioRun, setAudioRun] = useState<Run | null>(null);
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
    if (typeof v === "object") {
      return <span className="text-xs">{JSON.stringify(v)}</span>;
    }
    return <span>{String(v)}</span>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-mitadt-border bg-white shadow-sm">
      {audioRun && (
        <RunModal run={audioRun} onClose={() => setAudioRun(null)} />
      )}
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
                recording_url: r.recording_url ?? "",
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
              const hasRecording = !!r.recording_url;
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
                    {hasRecording ? (
                      <button
                        onClick={() => setAudioRun(r)}
                        className="inline-flex items-center justify-center rounded p-1 text-mitadt-purple hover:bg-mitadt-purple/10"
                        title="Play recording"
                      >
                        <Play className="h-4 w-4" />
                      </button>
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