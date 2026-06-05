import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Play, Pause, Eye, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { DASHBOARD_CONFIG } from "@/config/dashboard.config";
import { getCampaigns, controlCampaign } from "@/lib/alphaai.functions";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { EmptyState } from "@/components/ui/EmptyState";
import { RefreshIndicator } from "@/components/ui/RefreshIndicator";
import { formatDate } from "@/lib/utils-format";
import type { Campaign } from "@/types/alphaai";

export const Route = createFileRoute("/_authenticated/dashboard/campaigns/")({
  head: () => ({
    meta: [
      { title: "Campaigns · MIT-ADT AI Voice Platform" },
      {
        name: "description",
        content: "Manage and monitor outbound AI voice campaigns.",
      },
    ],
  }),
  component: CampaignsPage,
});

function CampaignsPage() {
  const fn = useServerFn(getCampaigns);
  const control = useServerFn(controlCampaign);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => fn(),
    refetchInterval: DASHBOARD_CONFIG.REFRESH_INTERVAL_MS,
  });
  const mutate = useMutation({
    mutationFn: (v: { id: number; action: "start" | "pause" | "resume" }) =>
      control({ data: v }),
    onSuccess: (_d, v) => {
      const msg = {
        start: "✓ Campaign started",
        pause: "⏸ Campaign paused",
        resume: "▶ Campaign resumed",
      }[v.action];
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Action failed"),
  });

  const campaigns: Campaign[] = q.data ?? [];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Campaigns"
        subtitle="Outbound AI voice calling campaigns"
        actions={
          <>
            <RefreshIndicator
              updatedAt={q.dataUpdatedAt}
              onRefresh={() => q.refetch()}
              isFetching={q.isFetching}
            />
            <Link
              to="/dashboard/campaigns/create"
              className="inline-flex items-center gap-1.5 rounded-lg bg-mitadt-orange px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-mitadt-orange-light"
            >
              <Plus className="h-4 w-4" /> Create Campaign
            </Link>
          </>
        }
      />

      {q.error && (
        <ErrorAlert error={q.error} onRetry={() => q.refetch()} />
      )}

      {!q.isLoading && campaigns.length === 0 && !q.error && (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create your first campaign to start placing AI voice calls to your contact list."
          action={
            <Link
              to="/dashboard/campaigns/create"
              className="inline-flex items-center gap-1.5 rounded-lg bg-mitadt-purple px-4 py-2 text-sm font-semibold text-white hover:bg-mitadt-purple-dark"
            >
              <Plus className="h-4 w-4" /> Create Campaign
            </Link>
          }
        />
      )}

      {(q.isLoading || campaigns.length > 0) && (
        <div className="overflow-hidden rounded-xl border border-mitadt-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-mitadt-bg-secondary text-left text-xs uppercase tracking-wider text-mitadt-text-muted">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {q.isLoading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t border-mitadt-border">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="h-5 w-full animate-pulse rounded bg-mitadt-bg-secondary" />
                      </td>
                    </tr>
                  ))}
                {campaigns.map((c, i) => {
                  const done = c.completed_contacts ?? 0;
                  const pct = c.total_contacts
                    ? Math.round((done / c.total_contacts) * 100)
                    : 0;
                  return (
                    <tr
                      key={c.id}
                      className="border-t border-mitadt-border hover:bg-mitadt-bg-secondary/50"
                    >
                      <td className="px-4 py-3 text-mitadt-text-muted">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <Link
                          to="/dashboard/campaigns/$id"
                          params={{ id: String(c.id) }}
                          className="text-mitadt-purple hover:underline"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={c.status}
                          pulse={c.status === "running"}
                        />
                      </td>
                      <td className="px-4 py-3">{c.total_contacts}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{done}</span>
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-mitadt-border">
                            <div
                              className="h-full bg-mitadt-purple"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-mitadt-text-muted">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-mitadt-text-muted">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {c.status === "draft" && (
                            <button
                              onClick={() =>
                                mutate.mutate({ id: c.id, action: "start" })
                              }
                              disabled={mutate.isPending}
                              className="inline-flex items-center gap-1 rounded-md bg-mitadt-green px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                            >
                              <Play className="h-3.5 w-3.5" /> Start
                            </button>
                          )}
                          {c.status === "running" && (
                            <button
                              onClick={() =>
                                mutate.mutate({ id: c.id, action: "pause" })
                              }
                              disabled={mutate.isPending}
                              className="inline-flex items-center gap-1 rounded-md bg-mitadt-orange px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                            >
                              <Pause className="h-3.5 w-3.5" /> Pause
                            </button>
                          )}
                          {c.status === "paused" && (
                            <button
                              onClick={() =>
                                mutate.mutate({ id: c.id, action: "resume" })
                              }
                              disabled={mutate.isPending}
                              className="inline-flex items-center gap-1 rounded-md bg-mitadt-green px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                            >
                              <Play className="h-3.5 w-3.5" /> Resume
                            </button>
                          )}
                          <Link
                            to="/dashboard/campaigns/$id"
                            params={{ id: String(c.id) }}
                            className="inline-flex items-center gap-1 rounded-md border border-mitadt-purple px-2.5 py-1.5 text-xs font-semibold text-mitadt-purple hover:bg-mitadt-purple hover:text-white"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}