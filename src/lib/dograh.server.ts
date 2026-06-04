/**
 * Server-only Dograh API client.
 * NEVER import this file from client code. All env reads happen here.
 * `process.env.DOGRAH_*` is injected at request time — read inside calls.
 */

export class DograhError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

function getConfig() {
  const base = process.env.DOGRAH_API_BASE_URL;
  const key = process.env.DOGRAH_API_KEY;
  if (!base || !key) {
    throw new DograhError(
      "Dograh credentials not configured (DOGRAH_API_BASE_URL / DOGRAH_API_KEY)",
      500,
    );
  }
  return { base: base.replace(/\/$/, ""), key };
}

export async function dograhFetch<T = unknown>(
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
    throw new DograhError(
      `Could not reach Dograh server: ${(e as Error).message}`,
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
    throw new DograhError(
      typeof detail === "string" ? detail : `Dograh ${res.status}`,
      res.status,
    );
  }
  return body as T;
}