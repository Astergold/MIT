import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Play, Pause, Clock } from "lucide-react";
import { toast } from "sonner";
import { DASHBOARD_CONFIG } from "@/config/dashboard.config";
import {
  getCampaign,
  getCampaignProgress,
  getCampaignRuns,
  controlCampaign,
} from "@/lib/alphaai.functions";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { RefreshIndicator } from "@/components/ui/RefreshIndicator";

export const Route = createFileRoute("/_authenticated/dashboard/campaigns/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Campaign #${params.id} · MIT-ADT AI Voice Platform` },
      {
        name: "description",
        content: `Live progress and leads for campaign ${params.id}.`,
      },
    ],
  }),
  component: CampaignDetail,
});

function CampaignDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const camp = useServerFn(getCampaign);
  const prog = useServerFn(getCampaignProgress);
  const runsFn = useServerFn(getCampaignRuns);
  const control = useServerFn(controlCampaign);

  const campQ = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => camp({ data: { id } }),
  });
  const progQ = useQuery({
    queryKey: ["campaign-progress", id],
    queryFn: () => prog({ data: { id } }),
    refetchInterval: DASHBOARD_CONFIG.CAMPAIGN_PROGRESS_INTERVAL_MS,
  });
  const runsQ = useQuery({
    queryKey: ["campaign-runs", id],
    queryFn: () => runsFn({ data: { id } }),
    refetchInterval: DASHBOARD_CONFIG.REFRESH_INTERVAL_MS,
  });

  const mutate = useMutation({
    mutationFn: (action: "start" | "pause" | "resume") =>
      control({ data: { id, action } }),
    onSuccess: () => {
      toast.success("Campaign updated");
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      qc.invalidateQueries({ queryKey: ["campaign-progress", id] });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Action failed"),
  });

  const c = campQ.data;
  const p = progQ.data;
  const completed = p?.completed ?? c?.completed_contacts ?? 0;
  const total = runsQ.data?.stats.total_contacts ?? p?.total_contacts ?? c?.total_contacts ?? 0;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        to="/dashboard/campaigns"
        className="mb-3 inline-flex items-center gap-1 text-sm text-mitadt-text-muted hover:text-mitadt-purple"
      >
        <ArrowLeft className="h-4 w-4" /> Back to campaigns
      </Link>
      <PageHeader
        title={c?.name ?? `Campaign #${id}`}
        subtitle={
          c?.status ? `Status: ${c.status}` : "Loading campaign…"
        }
        actions={
          <>
            <RefreshIndicator
              updatedAt={progQ.dataUpdatedAt}
              onRefresh={() => {
                progQ.refetch();
                runsQ.refetch();
              }}
              isFetching={progQ.isFetching}
            />
            {c?.status === "draft" && (
              <button
                onClick={() => mutate.mutate("start")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-mitadt-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                <Play className="h-4 w-4" /> Start
              </button>
            )}
            {c?.status === "running" && (
              <button
                onClick={() => mutate.mutate("pause")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-mitadt-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                <Pause className="h-4 w-4" /> Pause
              </button>
            )}
            {c?.status === "paused" && (
              <button
                onClick={() => mutate.mutate("resume")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-mitadt-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                <Play className="h-4 w-4" /> Resume
              </button>
            )}
          </>
        }
      />

      {campQ.error && <ErrorAlert error={campQ.error} onRetry={() => campQ.refetch()} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Contacts"
          value={runsQ.data?.stats.total_contacts ?? p?.total_contacts ?? 0}
          loading={runsQ.isLoading}
        />
        <StatCard
          label="Call Pickup"
          value={runsQ.data?.stats.call_pickup ?? 0}
          loading={runsQ.isLoading}
        />
        <StatCard
          label="Failed Calls"
          value={runsQ.data?.stats.failed_calls ?? 0}
          loading={runsQ.isLoading}
        />
        <StatCard
          label="Qualified"
          value={runsQ.data?.stats.qualified ?? 0}
          loading={runsQ.isLoading}
        />
      </div>

      <div className="mt-6 rounded-xl border border-mitadt-border bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-mitadt-purple-dark">
            Progress: {completed} / {total} contacts
          </span>
          <div className="flex items-center gap-3 text-mitadt-text-muted">
            {c?.status === "running" && p?.estimated_completion_minutes != null && (
              <span className="inline-flex items-center gap-1 text-xs">
                <Clock className="h-3.5 w-3.5" /> Est. completion in{" "}
                {p.estimated_completion_minutes} min
              </span>
            )}
            <StatusBadge status={c?.status ?? "draft"} pulse={c?.status === "running"} />
          </div>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-mitadt-border">
          <div
            className="bg-mitadt-hero h-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <h2 className="mt-8 mb-3 font-display text-xl font-extrabold text-mitadt-purple-dark">
        Leads
      </h2>
      {runsQ.error && <ErrorAlert error={runsQ.error} onRetry={() => runsQ.refetch()} />}
      {runsQ.isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-white" />
      ) : (
        <LeadsTable runs={runsQ.data?.runs ?? []} />
      )}
    </div>
  );
}