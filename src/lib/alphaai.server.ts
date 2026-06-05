/**
 * Server-only AlphaAI API client.
 * NEVER import this file from client code. All env reads happen here.
 * `process.env.ALPHAAI_*` is injected at request time — read inside calls.
 */

export class AlphaAIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

function getConfig() {
  const base = process.env.ALPHAAI_API_BASE_URL;
  const key = process.env.ALPHAAI_API_KEY;
  if (!base || !key) {
    throw new AlphaAIError(
      "AlphaAI credentials not configured (ALPHAAI_API_BASE_URL / ALPHAAI_API_KEY)",
      500,
    );
  }
  return { base: base.replace(/\/$/, ""), key };
}

export async function alphaAIFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { base, key } = getConfig();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
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
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
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
