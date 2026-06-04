import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSessionManager, getCurrentUser } from "./session.server";
import type { SessionUser } from "@/types/dograh";

const LoginInput = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data) => LoginInput.parse(data))
  .handler(async ({ data }) => {
    const expectedUser = process.env.DASHBOARD_USERNAME;
    const expectedPass = process.env.DASHBOARD_PASSWORD;
    if (!expectedUser || !expectedPass) {
      throw new Error("Dashboard credentials not configured on server.");
    }
    if (
      data.username !== expectedUser ||
      data.password !== expectedPass
    ) {
      throw new Error("Invalid username or password");
    }
    const clientName =
      process.env.VITE_CLIENT_NAME ?? "MIT ADT University";
    const user: SessionUser = {
      username: data.username,
      name: clientName,
      role: "admin",
    };
    const session = await getSessionManager();
    await session.update({ user });
    return { user };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await getSessionManager();
    await session.clear();
    return { ok: true };
  },
);

export const meFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getCurrentUser();
  return { user };
});