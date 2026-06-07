import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { alphaAIFetch } from "./alphaai.server";
import { getSessionManager, getCurrentUser } from "./session.server";
import type { SessionUser } from "@/types/alphaai";

const LoginInput = z.object({
  email: z.string().trim().min(1).max(100).email(),
  password: z.string().min(1).max(200),
});

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data) => LoginInput.parse(data))
  .handler(async ({ data }) => {
    const res = await fetch(
      `${process.env.ALPHAAI_API_BASE_URL?.replace(/\/$/, "")}/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      let detail = text;
      try { detail = (JSON.parse(text).detail ?? text) as string; } catch {}
      throw new Error(typeof detail === "string" ? detail : "Login failed");
    }

    const body = (await res.json()) as { token: string; user: Record<string, unknown> };
    if (!body.token) throw new Error("No token in login response.");

    const clientName =
      process.env.VITE_CLIENT_NAME ?? "MIT ADT University";

    const session = await getSessionManager();
    await session.update({
      user: {
        username: data.email,
        name: clientName,
        role: "admin",
      } as SessionUser,
      token: body.token,
    });

    return { user: { username: data.email, name: clientName, role: "admin" } };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await getSessionManager();
    await session.update({ token: undefined, user: undefined });
    return { ok: true };
  },
);

export const meFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getCurrentUser();
  return { user };
});
