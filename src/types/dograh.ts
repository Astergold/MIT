export type CampaignStatus =
  | "draft"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export interface Campaign {
  id: number;
  name: string;
  status: CampaignStatus;
  workflow_id: number;
  total_contacts: number;
  completed_contacts?: number;
  created_at: string;
}

export interface CampaignProgress {
  campaign_id: number;
  status: string;
  total_contacts: number;
  completed: number;
  failed: number;
  pending: number;
  success_rate: number;
  estimated_completion_minutes?: number;
}

export interface Run {
  id: number;
  workflow_id: number;
  workflow_name?: string;
  name: string;
  mode: "outbound" | "inbound" | "test";
  created_at: string;
  is_completed: boolean;
  call_duration_seconds?: number;
  caller_number?: string;
  called_number?: string;
  call_type?: string;
  disposition?: string;
  initial_context?: Record<string, any>;
  gathered_context?: Record<string, any>;
  charge_usd?: number;
  recording_public_url?: string;
  transcript_public_url?: string;
  public_access_token?: string;
  cost_info?: { llm_tokens: number; tts_chars: number };
  campaign_id?: number;
}

export interface OrgRunsResponse {
  runs: Run[];
  total_count: number;
  total_duration_seconds: number;
  total_dograh_tokens: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface Agent {
  id: number;
  uuid: string;
  name: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface HealthResponse {
  status: "ok" | "error";
  version: string;
  deployment_mode: string;
}

export interface SessionUser {
  username: string;
  name: string;
  role: "admin";
}