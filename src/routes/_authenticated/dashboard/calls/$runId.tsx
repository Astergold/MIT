import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, Clock, DollarSign, Calendar, Bot, Download } from "lucide-react";
import { getRun, getTranscript } from "@/lib/alphaai.functions";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, dispositionBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { formatDate, formatDuration, formatCurrency } from "@/lib/utils-format";

export const Route = createFileRoute("/_authenticated/dashboard/calls/$runId")({
  head: ({ params }) => ({
    meta: [{ title: `Call #${params.runId} · MIT-ADT AI Voice Platform` }],
  }),
  component: CallDetail,
});

function CallDetail() {
  const { runId } = Route.useParams();
  const fn = useServerFn(getRun);
  const trFn = useServerFn(getTranscript);
  const q = useQuery({ queryKey: ["run", runId], queryFn: () => fn({ data: { runId } }) });
  const r = q.data;
  const trQ = useQuery({
    queryKey: ["transcript", r?.public_access_token],
    queryFn: () => trFn({ data: { token: r!.public_access_token! } }),
    enabled: !!r?.public_access_token,
  });
  const disp = dispositionBadge(r?.disposition);

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/dashboard/calls" className="mb-3 inline-flex items-center gap-1 text-sm text-mitadt-text-muted hover:text-mitadt-purple">
        <ArrowLeft className="h-4 w-4" /> Back to calls
      </Link>
      <PageHeader title={`Call #${runId}`} subtitle={r?.workflow_name ?? ""} />
      {q.error && <ErrorAlert error={q.error} onRetry={() => q.refetch()} />}
      {r && (
        <>
          <div className="-mx-3 flex items-center gap-2 overflow-x-auto rounded-xl border border-mitadt-border bg-white px-3 py-3 shadow-sm sm:mx-0 sm:flex-wrap sm:gap-3 sm:px-5 sm:py-4">
            <Chip icon={Phone}>{r.called_number ?? "—"}</Chip>
            <Chip icon={Clock}>{formatDuration(r.call_duration_seconds)}</Chip>
            <StatusBadge status={disp.status} label={disp.label} />
            <Chip icon={Calendar}>{formatDate(r.created_at)}</Chip>
            <Chip icon={Bot}>{r.workflow_name ?? `Agent #${r.workflow_id}`}</Chip>
            <Chip icon={DollarSign}>{formatCurrency(r.charge_usd)}</Chip>
          </div>

          {r.recording_public_url && (
            <section className="mt-6 rounded-xl border border-mitadt-border bg-white p-4 shadow-sm sm:p-5">
              <h2 className="mb-3 font-display text-lg font-bold text-mitadt-purple-dark">🎵 Call Recording</h2>
              <audio controls src={r.recording_public_url} className="w-full" />
              <a
                href={r.recording_public_url}
                download
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-mitadt-orange px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Download Recording
              </a>
            </section>
          )}

          <section className="mt-6 rounded-xl border border-mitadt-border bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-4 font-display text-lg font-bold text-mitadt-purple-dark">📄 Conversation Transcript</h2>
            {trQ.isLoading && <div className="text-sm text-mitadt-text-muted">Loading transcript…</div>}
            {!r.public_access_token && (
              <div className="text-sm text-mitadt-text-muted">Transcript not available.</div>
            )}
            {trQ.data && <TranscriptBubbles data={trQ.data.transcript} />}
          </section>

          <ContextPanel title="Initial Context (CSV row)" data={r.initial_context} />
          <ContextPanel title="AI Gathered Context" data={r.gathered_context} />
        </>
      )}
    </div>
  );
}

function Chip({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-mitadt-bg-secondary px-3 py-1.5 text-xs text-mitadt-text-primary">
      <Icon className="h-3.5 w-3.5 shrink-0 text-mitadt-purple" />
      <span className="whitespace-nowrap">{children}</span>
    </span>
  );
}

function TranscriptBubbles({ data }: { data: any }) {
  const msgs: Array<{ role: string; text: string; ts?: string }> = Array.isArray(data)
    ? data.map((m: any) => ({
        role: String(m.role ?? m.speaker ?? "agent"),
        text: String(m.content ?? m.text ?? m.message ?? ""),
        ts: m.timestamp ?? m.time,
      }))
    : Array.isArray((data as any)?.messages)
    ? (data as any).messages.map((m: any) => ({
        role: String(m.role ?? "agent"),
        text: String(m.content ?? m.text ?? ""),
        ts: m.timestamp,
      }))
    : [];

  if (!msgs.length) return <pre className="text-xs text-mitadt-text-muted">{JSON.stringify(data, null, 2)}</pre>;

  return (
    <div className="space-y-3">
      {msgs.map((m, i) => {
        const isAgent = /agent|assistant|ai|bot/i.test(m.role);
        return (
          <div key={i} className={isAgent ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm " +
                (isAgent
                  ? "bg-mitadt-purple text-white"
                  : "border border-mitadt-purple/30 bg-white text-mitadt-text-primary")
              }
            >
              <div className="mb-0.5 text-[10px] uppercase tracking-wider opacity-70">
                {isAgent ? "AI Agent" : m.role || "Customer"}
              </div>
              <div>{m.text}</div>
              {m.ts && <div className="mt-1 text-[10px] opacity-60">{m.ts}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContextPanel({ title, data }: { title: string; data?: Record<string, any> }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <details className="mt-6 rounded-xl border border-mitadt-border bg-white p-5 shadow-sm">
      <summary className="cursor-pointer font-display text-base font-bold text-mitadt-purple-dark">{title}</summary>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-mitadt-border py-1.5">
            <dt className="text-mitadt-text-muted">{k.replace(/_/g, " ")}</dt>
            <dd className="font-medium">{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}