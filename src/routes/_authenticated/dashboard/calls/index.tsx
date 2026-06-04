import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Eye } from "lucide-react";
import { DASHBOARD_CONFIG } from "@/config/dashboard.config";
import { getRuns } from "@/lib/dograh.functions";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, dispositionBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { RefreshIndicator } from "@/components/ui/RefreshIndicator";
import { formatDate, formatDuration, formatCurrency } from "@/lib/utils-format";

export const Route = createFileRoute("/_authenticated/dashboard/calls/")({
  head: () => ({
    meta: [
      { title: "Calls · MIT-ADT AI Voice Platform" },
      { name: "description", content: "Call analytics with transcripts and recordings." },
    ],
  }),
  component: CallsPage,
});

function CallsPage() {
  const [page, setPage] = useState(1);
  const [phone, setPhone] = useState("");
  const fn = useServerFn(getRuns);
  const q = useQuery({
    queryKey: ["runs", { page, phone }],
    queryFn: () =>
      fn({
        data: {
          page,
          limit: DASHBOARD_CONFIG.DEFAULT_PAGE_SIZE,
          ...(phone ? { phone_number: phone } : {}),
        },
      }),
    refetchInterval: DASHBOARD_CONFIG.REFRESH_INTERVAL_MS,
  });
  const data = q.data;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Call Analytics"
        subtitle="All outbound calls placed by your AI agents"
        actions={
          <RefreshIndicator
            updatedAt={q.dataUpdatedAt}
            onRefresh={() => q.refetch()}
            isFetching={q.isFetching}
          />
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search phone number…"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-mitadt-border px-3 py-2 text-sm outline-none focus:border-mitadt-purple focus:ring-2 focus:ring-mitadt-purple/20"
        />
      </div>
      {q.error && <ErrorAlert error={q.error} onRetry={() => q.refetch()} />}
      <div className="overflow-hidden rounded-xl border border-mitadt-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-mitadt-bg-secondary text-left text-xs uppercase tracking-wider text-mitadt-text-muted">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Disposition</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3 text-right">Detail</th>
              </tr>
            </thead>
            <tbody>
              {(data?.runs ?? []).map((r, i) => {
                const d = dispositionBadge(r.disposition);
                return (
                  <tr key={r.id} className="border-t border-mitadt-border hover:bg-mitadt-bg-secondary/50">
                    <td className="px-4 py-3 text-xs text-mitadt-text-muted">
                      {(page - 1) * DASHBOARD_CONFIG.DEFAULT_PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.called_number ?? "—"}</td>
                    <td className="px-4 py-3 text-mitadt-text-muted">
                      {r.workflow_name ?? `Agent #${r.workflow_id}`}
                    </td>
                    <td className="px-4 py-3">{formatDuration(r.call_duration_seconds)}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} label={d.label} /></td>
                    <td className="px-4 py-3 text-xs">{formatCurrency(r.charge_usd)}</td>
                    <td className="px-4 py-3 text-xs text-mitadt-text-muted">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/dashboard/calls/$runId"
                        params={{ runId: String(r.id) }}
                        className="inline-flex items-center gap-1 rounded-md border border-mitadt-purple px-2.5 py-1.5 text-xs font-semibold text-mitadt-purple hover:bg-mitadt-purple hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!q.isLoading && (data?.runs?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-mitadt-text-muted">
                    No calls match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && (
          <div className="flex items-center justify-between border-t border-mitadt-border px-4 py-3 text-xs text-mitadt-text-muted">
            <span>
              Showing {(page - 1) * DASHBOARD_CONFIG.DEFAULT_PAGE_SIZE + 1}–
              {Math.min(page * DASHBOARD_CONFIG.DEFAULT_PAGE_SIZE, data.total_count)} of {data.total_count} calls ·
              Total duration {formatDuration(data.total_duration_seconds)} · {data.total_dograh_tokens.toLocaleString()} tokens
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-mitadt-border px-2 py-1 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="px-2 py-1">{page} / {data.total_pages}</span>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-mitadt-border px-2 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}