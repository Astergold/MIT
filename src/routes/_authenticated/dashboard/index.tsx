import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Megaphone,
  Phone,
  Activity,
  PlayCircle,
  ArrowRight,
} from "lucide-react";
import { DASHBOARD_CONFIG } from "@/config/dashboard.config";
import {
  getCampaigns,
  getRuns,
} from "@/lib/dograh.functions";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, dispositionBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { RefreshIndicator } from "@/components/ui/RefreshIndicator";
import { formatDate, formatDuration, isToday } from "@/lib/utils-format";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Overview · MIT-ADT AI Voice Platform" },
      {
        name: "description",
        content:
          "Live overview of voice AI campaigns, calls and system health for MIT-ADT University.",
      },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const campaignsFn = useServerFn(getCampaigns);
  const runsFn = useServerFn(getRuns);

  const campaignsQ = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => campaignsFn(),
    refetchInterval: DASHBOARD_CONFIG.REFRESH_INTERVAL_MS,
  });
  const runsQ = useQuery({
    queryKey: ["runs", { page: 1, limit: 10 }],
    queryFn: () => runsFn({ data: { page: 1, limit: 10 } }),
    refetchInterval: DASHBOARD_CONFIG.REFRESH_INTERVAL_MS,
  });

  const campaigns = campaignsQ.data ?? [];
  const runs = runsQ.data?.runs ?? [];
  const callsToday = runs.filter((r) => isToday(r.created_at)).length;
  const active = campaigns.filter((c) => c.status === "running").length;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Overview"
        subtitle={`Welcome back — ${DASHBOARD_CONFIG.CLIENT_NAME}`}
        actions={
          <RefreshIndicator
            updatedAt={campaignsQ.dataUpdatedAt}
            onRefresh={() => {
              campaignsQ.refetch();
              runsQ.refetch();
            }}
            isFetching={campaignsQ.isFetching || runsQ.isFetching}
          />
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Campaigns"
          value={campaigns.length}
          icon={Megaphone}
          loading={campaignsQ.isLoading}
        />
        <StatCard
          label="Calls Placed"
          value={runsQ.data?.total_count ?? 0}
          icon={Phone}
          loading={runsQ.isLoading}
        />
        <StatCard
          label="Active Campaigns"
          value={active}
          icon={Activity}
          loading={campaignsQ.isLoading}
        />
        <StatCard
          label="Calls Today"
          value={callsToday}
          icon={PlayCircle}
          loading={runsQ.isLoading}
        />
      </div>

      {(campaignsQ.error || runsQ.error) && (
        <div className="mt-6 space-y-3">
          {campaignsQ.error && (
            <ErrorAlert
              error={campaignsQ.error}
              onRetry={() => campaignsQ.refetch()}
            />
          )}
          {runsQ.error && (
            <ErrorAlert error={runsQ.error} onRetry={() => runsQ.refetch()} />
          )}
        </div>
      )}

      {/* Recent campaigns */}
      <section className="mt-8 rounded-xl border border-mitadt-border bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-mitadt-border px-5 py-4">
          <h2 className="font-display text-lg font-bold text-mitadt-purple-dark">
            Recent Campaigns
          </h2>
          <Link
            to="/dashboard/campaigns"
            className="inline-flex items-center gap-1 text-sm font-semibold text-mitadt-purple hover:underline"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-mitadt-bg-secondary text-left text-xs uppercase tracking-wider text-mitadt-text-muted">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Progress</th>
                <th className="px-5 py-3">Contacts</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.slice(0, 5).map((c) => {
                const pct = c.total_contacts
                  ? Math.round(
                      ((c.completed_contacts ?? 0) / c.total_contacts) * 100,
                    )
                  : 0;
                return (
                  <tr
                    key={c.id}
                    className="border-t border-mitadt-border hover:bg-mitadt-bg-secondary/50"
                  >
                    <td className="px-5 py-3 font-medium">
                      <Link
                        to="/dashboard/campaigns/$id"
                        params={{ id: String(c.id) }}
                        className="text-mitadt-purple hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={c.status}
                        pulse={c.status === "running"}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-mitadt-border">
                          <div
                            className="h-full bg-mitadt-purple transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-mitadt-text-muted">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-mitadt-text-muted">
                      {c.completed_contacts ?? 0} / {c.total_contacts}
                    </td>
                  </tr>
                );
              })}
              {campaigns.length === 0 && !campaignsQ.isLoading && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm text-mitadt-text-muted"
                  >
                    No campaigns yet.{" "}
                    <Link
                      to="/dashboard/campaigns/create"
                      className="font-semibold text-mitadt-purple hover:underline"
                    >
                      Create your first one
                    </Link>
                    .
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent calls */}
      <section className="mt-6 rounded-xl border border-mitadt-border bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-mitadt-border px-5 py-4">
          <h2 className="font-display text-lg font-bold text-mitadt-purple-dark">
            Recent Calls
          </h2>
          <Link
            to="/dashboard/calls"
            className="inline-flex items-center gap-1 text-sm font-semibold text-mitadt-purple hover:underline"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-mitadt-bg-secondary text-left text-xs uppercase tracking-wider text-mitadt-text-muted">
              <tr>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Disposition</th>
                <th className="px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 10).map((r) => {
                const d = dispositionBadge(r.disposition);
                return (
                  <tr
                    key={r.id}
                    className="border-t border-mitadt-border hover:bg-mitadt-bg-secondary/50"
                  >
                    <td className="px-5 py-3 font-mono text-xs">
                      {r.called_number ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-mitadt-text-muted">
                      {r.workflow_name ?? `Agent #${r.workflow_id}`}
                    </td>
                    <td className="px-5 py-3">
                      {formatDuration(r.call_duration_seconds)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={d.status} label={d.label} />
                    </td>
                    <td className="px-5 py-3 text-xs text-mitadt-text-muted">
                      {formatDate(r.created_at)}
                    </td>
                  </tr>
                );
              })}
              {runs.length === 0 && !runsQ.isLoading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-mitadt-text-muted"
                  >
                    No calls placed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}