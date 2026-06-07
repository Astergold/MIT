/**
 * Server-only AlphaAI API client.
 * NEVER import this file from client code.
 *
 * Reads the per-user JWT from the TanStack Start session cookie
 * and uses it as the Bearer token.  Falls back to ALPHAAI_API_KEY
 * only when no session token exists (pre-login / health-check paths).
 */

export class AlphaAIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

function getBaseUrl(): string {
  return (process.env.ALPHAAI_API_BASE_URL ?? "").replace(/\/$/, "");
}

/**
 * Reads the JWT token from the current request's session.
 * Must be called inside a serverFn handler (request context required).
 */
export async function getApiToken(): Promise<string | undefined> {
  const session = useSession<{ token?: string }>({
    password: process.env.SESSION_SECRET!,
    name: "mitadt-session",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, sameSite: "lax" as const, secure: true, path: "/" },
  });
  return session.data.token;
}

export async function alphaAIFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  fallbackToken?: string,
): Promise<T> {
  const base = getBaseUrl();
  if (!base) {
    throw new AlphaAIError(
      "ALPHAAI_API_BASE_URL is not configured on the server.",
      500,
    );
  }

  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  let token: string | undefined;

  // Use fallback (passed in) or try reading from session
  if (fallbackToken) {
    token = fallbackToken;
  } else {
    try {
      const session = useSession<{ token?: string }>({
        password: process.env.SESSION_SECRET!,
        name: "mitadt-session",
        maxAge: 60 * 60 * 24 * 7,
        cookie: { httpOnly: true, sameSite: "lax" as const, secure: true, path: "/" },
      });
      token = session.data.token;
    } catch {
      // No session context (shouldn't happen in normal serverFn flow)
      token = undefined;
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (e) {
    throw new AlphaAIError(
      `Could not reach AlphaAI server: ${(e as Error).message}`,
      503,
    );
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }

  if (!res.ok) {
    const detail =
      body && typeof body === "object" && "detail" in body
        ? (body as { detail: unknown }).detail
        : body;

    // 401 or "Invalid or expired token" → clear the session token
    const isExpired =
      res.status === 401 ||
      (typeof detail === "string" &&
        detail.toLowerCase().includes("invalid or expired token"));

    if (isExpired) {
      try {
        const session = useSession<{ token?: string }>({
          password: process.env.SESSION_SECRET!,
          name: "mitadt-session",
          maxAge: 60 * 60 * 24 * 7,
          cookie: { httpOnly: true, sameSite: "lax" as const, secure: true, path: "/" },
        });
        await session.update({ token: undefined });
      } catch { /* best-effort clear */ }
    }

    throw new AlphaAIError(
      typeof detail === "string" ? detail : `AlphaAI ${res.status}`,
      res.status,
    );
  }

  return body as T;
}
