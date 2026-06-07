/**
 * Server-only AlphaAI API client.
 * NEVER import this file from client code.
 *
 * The token is passed in by the caller (server function) to ensure
 * we have the request context.  This avoids session read issues.
 */

export class AlphaAIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

function getBaseUrl(): string {
  return (process.env.ALPHAAI_API_BASE_URL ?? "").replace(/\/$/, "");
}

export async function alphaAIFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const base = getBaseUrl();
  if (!base) {
    throw new AlphaAIError(
      "ALPHAAI_API_BASE_URL is not configured on the server.",
      500,
    );
  }

  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  console.log("[alphaai] alphaAIFetch:", path, "token:", token ? "present" : "MISSING");

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

    throw new AlphaAIError(
      typeof detail === "string" ? detail : `AlphaAI ${res.status}`,
      res.status,
    );
  }

  return body as T;
}