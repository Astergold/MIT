import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Upload, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DASHBOARD_CONFIG } from "@/config/dashboard.config";
import { getAgents, presignUpload, createCampaign } from "@/lib/alphaai.functions";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

export const Route = createFileRoute("/_authenticated/dashboard/campaigns/create")({
  head: () => ({ meta: [{ title: "Create Campaign · MIT-ADT AI Voice Platform" }] }),
  component: CreatePage,
});

function CreatePage() {
  const navigate = useNavigate();
  const presign = useServerFn(presignUpload);
  const create = useServerFn(createCampaign);
  const agentsFn = useServerFn(getAgents);
  const agentsQ = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rowCount, setRowCount] = useState(0);

  const [form, setForm] = useState<{
    name: string;
    workflow_id: number;
    max_concurrent_calls: number;
    retry_count: number;
    retry_delay_minutes: number;
    call_start_time: string;
    call_end_time: string;
    call_days: string[];
    timezone: string;
  }>({
    name: "",
    workflow_id: 0,
    max_concurrent_calls: DASHBOARD_CONFIG.DEFAULT_MAX_CONCURRENT_CALLS,
    retry_count: DASHBOARD_CONFIG.DEFAULT_RETRY_COUNT,
    retry_delay_minutes: DASHBOARD_CONFIG.DEFAULT_RETRY_DELAY_MINUTES,
    call_start_time: DASHBOARD_CONFIG.DEFAULT_CALL_START_TIME,
    call_end_time: DASHBOARD_CONFIG.DEFAULT_CALL_END_TIME,
    call_days: [...DASHBOARD_CONFIG.DEFAULT_CALL_DAYS],
    timezone: DASHBOARD_CONFIG.DEFAULT_TIMEZONE,
  });

  async function handleFile(f: File) {
    setFile(f);
    const text = await f.text();
    setRowCount(Math.max(0, text.split(/\r?\n/).filter(Boolean).length - 1));
    setUploading(true);
    try {
      const p = await presign({
        data: { filename: f.name, content_type: "text/csv" },
      });
      await fetch(p.upload_url, {
        method: "PUT",
        body: f,
        headers: { "Content-Type": "text/csv" },
      });
      setFileKey(p.file_key);
      toast.success("✓ File uploaded successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const mutate = useMutation({
    mutationFn: () =>
      create({ data: { ...form, file_key: fileKey! } }),
    onSuccess: (c) => {
      toast.success("✓ Campaign created!");
      navigate({
        to: "/dashboard/campaigns/$id",
        params: { id: String(c.id) },
      });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Create failed"),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Create Campaign" subtitle="3-step wizard" />

      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-2 text-sm">
        {[1, 2, 3].map((s) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold " +
                (step >= s
                  ? "bg-mitadt-purple text-white"
                  : "bg-mitadt-bg-secondary text-mitadt-text-muted")
              }
            >
              {s}
            </span>
            {s < 3 && <div className="h-px flex-1 bg-mitadt-border" />}
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-mitadt-border bg-white p-6 shadow-sm">
        {step === 1 && (
          <div>
            <h2 className="font-display text-xl font-bold">Upload contacts</h2>
            <p className="mt-1 text-sm text-mitadt-text-muted">
              Required column: <code className="rounded bg-mitadt-bg-secondary px-1">phone_number</code> in E.164 format.
            </p>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-mitadt-purple/40 bg-mitadt-bg-secondary px-6 py-10 text-center hover:border-mitadt-purple">
              <Upload className="h-8 w-8 text-mitadt-purple" />
              <span className="mt-2 text-sm font-semibold text-mitadt-purple">
                {file ? file.name : "Drop CSV here or click to browse"}
              </span>
              {file && (
                <span className="text-xs text-mitadt-text-muted">
                  {rowCount} rows · {(file.size / 1024).toFixed(1)} KB
                </span>
              )}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
            {uploading && (
              <div className="mt-3 flex items-center gap-2 text-sm text-mitadt-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button
                disabled={!fileKey}
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 rounded-lg bg-mitadt-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">Campaign settings</h2>
            {agentsQ.error && <ErrorAlert error={agentsQ.error} />}
            <Field label="Campaign name">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Agent">
              <select
                value={form.workflow_id}
                onChange={(e) => setForm({ ...form, workflow_id: Number(e.target.value) })}
                className="input"
              >
                <option value={0}>Select agent…</option>
                {(agentsQ.data ?? []).filter((a) => a.status === "active").map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Max concurrent">
                <input type="number" min={1} value={form.max_concurrent_calls}
                  onChange={(e) => setForm({ ...form, max_concurrent_calls: Number(e.target.value) })}
                  className="input" />
              </Field>
              <Field label="Retry count">
                <input type="number" min={0} value={form.retry_count}
                  onChange={(e) => setForm({ ...form, retry_count: Number(e.target.value) })}
                  className="input" />
              </Field>
              <Field label="Retry delay (min)">
                <input type="number" min={0} value={form.retry_delay_minutes}
                  onChange={(e) => setForm({ ...form, retry_delay_minutes: Number(e.target.value) })}
                  className="input" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Call start">
                <input type="time" value={form.call_start_time}
                  onChange={(e) => setForm({ ...form, call_start_time: e.target.value })} className="input" />
              </Field>
              <Field label="Call end">
                <input type="time" value={form.call_end_time}
                  onChange={(e) => setForm({ ...form, call_end_time: e.target.value })} className="input" />
              </Field>
            </div>
            <Field label="Days">
              <div className="flex flex-wrap gap-2">
                {["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].map((d) => {
                  const on = form.call_days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm({
                        ...form,
                        call_days: on
                          ? form.call_days.filter((x) => x !== d)
                          : [...form.call_days, d],
                      })}
                      className={
                        "rounded-full px-3 py-1 text-xs font-semibold capitalize " +
                        (on ? "bg-mitadt-purple text-white" : "bg-mitadt-bg-secondary text-mitadt-text-muted")
                      }
                    >
                      {d.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Timezone">
              <input value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="input" />
            </Field>
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-mitadt-text-muted hover:underline">← Back</button>
              <button
                disabled={!form.name || !form.workflow_id}
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1 rounded-lg bg-mitadt-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-display text-xl font-bold">Review & create</h2>
            <dl className="mt-4 divide-y divide-mitadt-border text-sm">
              {Object.entries({ ...form, contacts: rowCount, file: file?.name }).map(([k, v]) => (
                <div key={k} className="flex justify-between py-2">
                  <dt className="text-mitadt-text-muted capitalize">{k.replace(/_/g, " ")}</dt>
                  <dd className="font-medium">{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(2)} className="text-sm text-mitadt-text-muted hover:underline">← Back</button>
              <button
                disabled={mutate.isPending}
                onClick={() => mutate.mutate()}
                className="inline-flex items-center gap-2 rounded-lg bg-mitadt-purple px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-mitadt-purple-dark disabled:opacity-50"
              >
                {mutate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                ⚡ Create Campaign
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`.input { width: 100%; border-radius: 0.5rem; border: 1px solid var(--mitadt-border); padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
      .input:focus { border-color: var(--mitadt-purple); box-shadow: 0 0 0 3px color-mix(in oklab, var(--mitadt-purple) 20%, transparent); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-mitadt-text-primary">{label}</span>
      {children}
    </label>
  );
}