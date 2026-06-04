# MIT-ADT AI Voice Platform

White-label PWA dashboard for managing Dograh AI voice campaigns.

## Stack

- **TanStack Start** (Vite + React 19) — server functions proxy Dograh; secrets never reach the browser
- **TanStack Query** — auto-refresh via `DASHBOARD_CONFIG.REFRESH_INTERVAL_MS`
- **Tailwind v4** + custom MITADT design tokens (`src/styles.css`)
- **PWA** — installable via `public/manifest.webmanifest`

## Secrets (Lovable Cloud → Project Settings)

| Name | Purpose |
|---|---|
| `DOGRAH_API_BASE_URL` | e.g. `https://4.213.120.108/api/v1` — server-only |
| `DOGRAH_API_KEY` | Dograh API key — server-only |
| `DASHBOARD_USERNAME` | Login username |
| `DASHBOARD_PASSWORD` | Login password |
| `SESSION_SECRET` | ≥32-char random string for cookie encryption |

Optional public (`VITE_*`) variables — safe in bundle:

| Name | Default |
|---|---|
| `VITE_REFRESH_INTERVAL_MS` | `600000` (10 min) |
| `VITE_APP_NAME` | `MIT-ADT AI Voice Platform` |
| `VITE_CLIENT_NAME` | `MIT ADT University` |

## Editing operational values

All configurable defaults live in **`src/config/dashboard.config.ts`** — refresh
intervals, pagination, retry policy, expected CSV columns. Edit there only.

## Reset password

Update `DASHBOARD_PASSWORD` in Project Settings → Secrets, then redeploy.
No code change needed.

## Self-signed Dograh cert

If the Dograh server uses a self-signed TLS cert, requests from the server
function will fail. Fix at the source (Let's Encrypt / Cloudflare tunnel).
Do NOT disable TLS verification in production.

## Routes

- `/login` — public sign-in
- `/dashboard` — overview
- `/dashboard/campaigns` — list, start/pause/resume
- `/dashboard/campaigns/create` — 3-step wizard
- `/dashboard/campaigns/:id` — progress + leads
- `/dashboard/calls` — analytics
- `/dashboard/calls/:runId` — transcript + recording
- `/dashboard/agents` — read-only agent list

All `/dashboard/*` routes are gated by `src/routes/_authenticated.tsx`.