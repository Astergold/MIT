// ─────────────────────────────────────────────────────────────
// SINGLE CONFIG FILE — edit values here, they apply everywhere.
// To change refresh interval: update VITE_REFRESH_INTERVAL_MS in env.
// ─────────────────────────────────────────────────────────────

const num = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const DASHBOARD_CONFIG = {
  // Polling / auto-refresh
  REFRESH_INTERVAL_MS: num(import.meta.env.VITE_REFRESH_INTERVAL_MS, 600_000),
  CAMPAIGN_PROGRESS_INTERVAL_MS: 30_000,
  HEALTH_CHECK_INTERVAL_MS: 60_000,

  // App identity
  APP_NAME: import.meta.env.VITE_APP_NAME ?? "MIT-ADT AI Voice Platform",
  CLIENT_NAME: import.meta.env.VITE_CLIENT_NAME ?? "MIT ADT University",
  SHORT_NAME: "AlphaAI",

  // Pagination
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,

  // Campaign defaults
  DEFAULT_MAX_CONCURRENT_CALLS: 5,
  DEFAULT_RETRY_COUNT: 2,
  DEFAULT_RETRY_DELAY_MINUTES: 30,
  DEFAULT_CALL_START_TIME: "09:00",
  DEFAULT_CALL_END_TIME: "18:00",
  DEFAULT_TIMEZONE: "Asia/Kolkata",
  DEFAULT_CALL_DAYS: [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ] as string[],

  // Leads table dynamic-column rendering order.
  EXPECTED_CSV_COLUMNS: [
    "phone_number",
    "customer_name",
    "city",
    "email",
    "course_applied",
    "agreed",
    "callback_date",
    "notes",
    "call_attempts",
    "status",
  ] as string[],
} as const;