import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { alphaAIFetch, alphaFetchText } from "./alphaai.server";
import { requireUser, getToken } from "./session.server";
import type {
  Agent,
  Campaign,
  CampaignProgress,
  HealthResponse,
  OrgRunsResponse,
  Run,
} from "@/types/alphaai";

// ── Health ─────────────────────────────────────────────────────
export const getHealth = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireUser();
    try {
      const token = await getToken();
      const data = await alphaAIFetch<HealthResponse>("/health", {}, token);
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
    const token = await getToken();
    const data = await alphaAIFetch<Agent[] | { workflows?: Agent[] }>(
      "/workflow/fetch",
      {},
      token,
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
    const token = await getToken();
    const data = await alphaAIFetch<
      Campaign[] | { campaigns?: Campaign[] }
    >("/campaign/", {}, token);
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
    const token = await getToken();
    const c = await alphaAIFetch<Campaign>(`/campaign/${data.id}`, {}, token);
    return normalizeCampaign(c);
  });

// ── Campaign progress (polls every 30s on detail page) ─────────
export const getCampaignProgress = createServerFn({ method: "GET" })
  .inputValidator((d) => IdInput.parse(d))
  .handler(async ({ data }) => {
    await requireUser();
    const token = await getToken();
    const raw = await alphaAIFetch<any>(`/campaign/${data.id}/progress`, {}, token);
    return {
      campaign_id: data.id,
      total_contacts: raw.total_rows ?? 0,
      completed: raw.processed_rows ?? 0,
      pending: (raw.total_rows ?? 0) - (raw.processed_rows ?? 0),
      failed: 0,
      success_rate: (raw.progress_percentage ?? 0) / 100,
      status: raw.state ?? "unknown",
      estimated_completion_minutes: raw.estimated_completion_minutes ?? null,
    };
  });

// ── Campaign runs (leads table) ────────────────────────────────
export const getCampaignRuns = createServerFn({ method: "GET" })
  .inputValidator((d) => IdInput.parse(d))
  .handler(async ({ data }) => {
    await requireUser();
    const token = await getToken();

    const firstPage = await alphaAIFetch<any>(
      `/campaign/${data.id}/runs?page=1&limit=100`,
      {},
      token
    );

    const totalPages: number = firstPage.total_pages ?? 1;
    let allRuns = [...(firstPage.runs ?? [])];

    for (let page = 2; page <= totalPages; page++) {
      const pageData = await alphaAIFetch<any>(
        `/campaign/${data.id}/runs?page=${page}&limit=100`,
        {},
        token
      );
      allRuns = [...allRuns, ...(pageData.runs ?? [])];
    }

    let call_pickup = 0;
    let failed_calls = 0;
    let qualified = 0;

    for (const run of allRuns) {
      const tags: string[] = run.gathered_context?.call_tags ?? [];
      if (tags.includes("not_connected")) {
        failed_calls++;
      } else if (tags.length > 0) {
        call_pickup++;
        if (tags.includes("user_qualified")) qualified++;
      }
    }

    const total = firstPage.total_count ?? allRuns.length;

    return {
      runs: allRuns,
      total_count: total,
      stats: {
        total_contacts: total,
        call_pickup,
        failed_calls,
        qualified,
        pending: total - call_pickup - failed_calls,
      },
    };
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
    const token = await getToken();
    await alphaAIFetch(`/campaign/${data.id}/${data.action}`, {
      method: "POST",
    }, token);
    return { ok: true as const };
  });

// ── Create campaign ────────────────────────────────────────────
const CreateCampaignInput = z.object({
  name: z.string().trim().min(1).max(255),
  workflow_id: z.number().int().positive(),
  file_key: z.string().min(1),
  max_concurrent_calls: z.number().int().min(1).max(50),
  retry_count: z.number().int().min(0).max(10),
  retry_delay_minutes: z.number().int().min(0).max,
  call_start_time: z.string(),
  call_end_time: z.string(),
  call_days: z.array(z.string()).min(1),
  timezone: z.string(),
});

export const createCampaign = createServerFn({ method: "POST" })
  .inputValidator((d) => CreateCampaignInput.parse(d))
  .handler(async ({ data }) => {
    await requireUser();
    const token = await getToken();
    return alphaAIFetch<Campaign>("/campaign/", {
      method: "POST",
      body: JSON.stringify(data),
    }, token);
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
    const token = await getToken();
    const params = new URLSearchParams();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
    return alphaAIFetch<OrgRunsResponse>(
      `/organizations/usage/runs?${params.toString()}`,
      {},
      token,
    );
  });

// ── Single run detail ─────────────────────────────────────────
const RunDetailInput = z.object({
  runId: z.union([z.string(), z.number()]),
  workflowId: z.union([z.string(), z.number()]),
});

export const getRun = createServerFn({ method: "GET" })
  .inputValidator((d) => RunDetailInput.parse(d))
  .handler(async ({ data }) => {
    await requireUser();
    const token = await getToken();
    const wf = data.workflowId ? `?workflow_id=${data.workflowId}` : "";
    return alphaAIFetch<Run>(`/workflow/${data.workflowId}/runs/${data.runId}`, {}, token);
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
    const token = await getToken();
    return alphaAIFetch<{ upload_url: string; file_key: string }>(
      "/upload/presign",
      { method: "POST", body: JSON.stringify(data) },
      token,
    );
  });

// ── Transcript fetch (proxied so token stays server-side) ─────
const TranscriptInput = z.object({ token: z.string().min(1) });

export const getTranscript = createServerFn({ method: "GET" })
  .inputValidator((d) => TranscriptInput.parse(d))
  .handler(async ({ data }) => {
    await requireUser();
    const apiToken = await getToken();
    const transcript = await alphaFetchText(
      `/public/download/workflow/${data.token}/transcript`,
      {},
      apiToken,
    );
    return { transcript };
  });