import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Bot } from "lucide-react";
import { getAgents } from "@/lib/dograh.functions";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils-format";

export const Route = createFileRoute("/_authenticated/dashboard/agents/")({
  head: () => ({ meta: [{ title: "Voice Agents · MIT-ADT AI Voice Platform" }] }),
  component: AgentsPage,
});

function AgentsPage() {
  const fn = useServerFn(getAgents);
  const q = useQuery({ queryKey: ["agents"], queryFn: () => fn() });
  const agents = q.data ?? [];
  const active = agents.filter((a) => a.status === "active").length;
  const archived = agents.length - active;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Voice Agents"
        subtitle={`${active} active · ${archived} archived`}
      />
      {q.error && <ErrorAlert error={q.error} onRetry={() => q.refetch()} />}
      {!q.isLoading && agents.length === 0 && !q.error && (
        <EmptyState icon={Bot} title="No agents configured" description="Voice agents are configured directly on the Dograh server." />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {agents.map((a) => (
          <div key={a.id} className="rounded-xl border border-mitadt-border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-mitadt-purple-dark">{a.name}</h3>
                <p className="mt-1 text-xs text-mitadt-text-muted">Created {formatDate(a.created_at)}</p>
                <p className="text-xs text-mitadt-text-muted">Updated {formatDate(a.updated_at)}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
            <Link
              to="/dashboard/calls"
              className="mt-4 inline-block text-sm font-semibold text-mitadt-purple hover:underline"
            >
              View Calls →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}