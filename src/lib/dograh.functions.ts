import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dograhFetch } from "./dograh.server";
import { requireUser } from "./session.server";
import type {
  Agent,
  Campaign,
  CampaignProgress,
  HealthResponse,
  OrgRunsResponse,
  Run,
} from "@/types/dograh";

// ── Health ─────────────────────────────────────────────────────
export const getHealth = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireUser();
    try {
      const data = await dograhFetch<HealthResponse>("/health");
      return { ok: true as const, data };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  },
);

// ── Agents ─────────────────────────────────────────────────────
export const getAgents = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireUser();
    const data = await dograhFetch<Agent[] | { workflows?: Agent[] }>(
      "/workflow/fetch",
    );
    const list = Array.isArray(data) ? data : (data.workflows ?? []);
    return list;
  },
);

// Normalize a campaign: the live API returns `state` where the UI expects `status`.
// Map it here so the rest of the app keeps using `status`.
const normalizeCampaign = (c: Campaign): Campaign => {
  const cj = c as Campaign & { state?: Campaign["status"] };
  if (!cj.status && cj.state) {
    return { ...cj, status: cj.state };
  }
  return cj;
};

// ── Campaigns list ─────────────────────────────────────────────
export const getCampaigns = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireUser();
    const data = await dograhFetch<
      Campaign[] | { campaigns?: Campaign[] }
    >("/campaign/");
    const list = Array.isArray(data) ? data : (data.campaigns ?? []);
    return list.map(normalizeCampaign);
  },
);

// ── Single campaign ────────────────────────────────────────────
const IdInput = z.object({ id: z.union([z.string(), z.number()]) });

export const getCampaign = createServerFn({ method: "GET" })
  .inputValidator((d) => IdInput.parse(d))
  .handler(async ({ data }) => {
    await requireUser();
    const c = await dograhFetch<Campaign>(`/campaign/${data.id}`);
    return normalizeCampaign(c);
  });

// ── Campaign progress (polls every 30s on detail page) ─────────
export const getCampaignProgress = createServerFn({ method: "GET" })
  .inputValidator((d) => IdInput.parse(d))
  .handler(async ({ data }) => {
    await requireUser();
    return dograhFetch<CampaignProgress>(`/campaign/${data.id}/progress`);
  });

// ── Campaign runs (leads table) ────────────────────────────────
export const getCampaignRuns = createServerFn({ method: "GET" })
  .inputValidator((d) => IdInput.parse(d))
  .handler(async ({ data }) => {
    await requireUser();
    const res = await dograhFetch<Run[] | OrgRunsResponse>(
      `/campaign/${data.id}/runs`,
    );
    return Array.isArray(res) ? res : res.runs;
  });

// ── Campaign control ───────────────────────────────────────────
const actionInput = z.object({
  id: z.union([z.string(), z.number()]),
  action: z.enum(["start", "pause", "resume"]),
});

export const controlCampaign = createServerFn({ method: "POST" })
  .inputValidator((d) => actionInput.parse(d))
  .handler(async ({ data }) => {
    await requireUser();
    await dograhFetch(`/campaign/${data.id}/${data.action}`, {
      method: "POST",
    });
    return { ok: true as const };
  });

// ── Create campaign ────────────────────────────────────────────
const CreateCampaignInput = z.object({
  name: z.string().trim().min(1).max(255),
  workflow_id: z.number().int().positive(),
  file_key: z.string().min(1),
  max_concurrent_calls: z.number().int().min(1).max(50),
  retry_count: z.number().int().min(0).max(10),
  retry_delay_minutes: z.number().int().min(0).max(1440),
  call_start_time: z.string(),
  call_end_time: z.string(),
  call_days: z.array(z.string()).min(1),
  timezone: z.string(),
});

export const createCampaign = createServerFn({ method: "POST" })
  .inputValidator((d) => CreateCampaignInput.parse(d))
  .handler(async ({ data }) => {
    await requireUser();
    return dograhFetch<Campaign>("/campaign/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

// ── Org runs (calls analytics) ────────────────────────────────
const RunsListInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  campaign_id: z.string().optional(),
  disposition: z.string().optional(),
  min_duration: z.number().optional(),
  max_duration: z.number().optional(),
  phone_number: z.string().optional(),
});

export const getRuns = createServerFn({ method: "GET" })
  .inputValidator((d) => RunsListInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    await requireUser();
    const params = new URLSearchParams();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
    return dograhFetch<OrgRunsResponse>(
      `/organizations/usage/runs?${params.toString()}`,
    );
  });

// ── Single run detail ─────────────────────────────────────────
const RunDetailInput = z.object({
  runId: z.union([z.string(), z.number()]),
  workflowId: z.union([z.string(), z.number()]).optional(),
});

export const getRun = createServerFn({ method: "GET" })
  .inputValidator((d) => RunDetailInput.parse(d))
  .handler(async ({ data }) => {
    await requireUser();
    const wf = data.workflowId ? `?workflow_id=${data.workflowId}` : "";
    return dograhFetch<Run>(`/run/${data.runId}${wf}`);
  });

// ── Upload presign ────────────────────────────────────────────
const PresignInput = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().default("text/csv"),
});

export const presignUpload = createServerFn({ method: "POST" })
  .inputValidator((d) => PresignInput.parse(d))
  .handler(async ({ data }) => {
    await requireUser();
    return dograhFetch<{ upload_url: string; file_key: string }>(
      "/upload/presign",
      { method: "POST", body: JSON.stringify(data) },
    );
  });

// ── Transcript fetch (proxied so token stays server-side) ─────
const TranscriptInput = z.object({ token: z.string().min(1) });

export const getTranscript = createServerFn({ method: "GET" })
  .inputValidator((d) => TranscriptInput.parse(d))
  .handler(async ({ data }) => {
    await requireUser();
    const raw = await dograhFetch<any>(
      `/public/download/workflow/${data.token}/transcript`,
    );
    return { transcript: raw as any };
  });