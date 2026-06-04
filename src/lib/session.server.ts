import { useSession } from "@tanstack/react-start/server";
import type { SessionUser } from "@/types/dograh";

export interface SessionData {
  user?: SessionUser;
}

function getSessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET must be at least 32 characters (set as a secret).",
    );
  }
  return {
    password,
    name: "mitadt-session",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    cookie: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: true,
      path: "/",
    },
  };
}

export async function getSessionManager() {
  return useSession<SessionData>(getSessionConfig());
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSessionManager();
  return session.data.user ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return user;
}