import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Mic } from "lucide-react";
import { loginFn } from "@/lib/auth.functions";
import { DASHBOARD_CONFIG } from "@/config/dashboard.config";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · MIT-ADT AI Voice Platform" },
      {
        name: "description",
        content:
          "Secure sign in for MIT-ADT University AI voice campaign management.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const login = useServerFn(loginFn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login({ data: { email: email.trim(), password } });
      await navigate({ to: "/dashboard" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid username or password",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand pane */}
      <div className="bg-mitadt-hero relative flex items-center justify-center px-6 py-8 text-white sm:px-8 sm:py-12 lg:w-2/5 lg:py-0">
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur sm:h-20 sm:w-20">
            <Mic className="h-7 w-7 sm:h-10 sm:w-10" strokeWidth={2.2} />
          </div>
          <h1 className="mt-4 font-display text-xl font-extrabold leading-tight sm:mt-6 sm:text-3xl">
            {DASHBOARD_CONFIG.APP_NAME}
          </h1>
          <p className="mt-2 text-xs text-white/80 sm:mt-3 sm:text-sm">
            AI-Powered Voice Platform for {DASHBOARD_CONFIG.CLIENT_NAME}
          </p>
        </div>
      </div>

      {/* Form pane */}
      <div className="flex flex-1 items-center justify-center bg-white px-5 py-8 sm:px-6 sm:py-12">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm"
          aria-label="Sign in form"
        >
          <h2 className="font-display text-xl font-extrabold text-mitadt-purple-dark sm:text-2xl">
            Sign in
          </h2>
          <p className="mt-1 text-sm text-mitadt-text-muted">
            Use the admin credentials provided for your campus.
          </p>

          <label className="mt-6 block text-sm font-medium text-mitadt-text-primary">
            Email
            <input
              type="text"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-mitadt-border px-3 py-2.5 outline-none focus:border-mitadt-purple focus:ring-2 focus:ring-mitadt-purple/20"
              disabled={busy}
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-mitadt-text-primary">
            Password
            <div className="relative mt-1.5">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-mitadt-border px-3 py-2.5 pr-10 outline-none focus:border-mitadt-purple focus:ring-2 focus:ring-mitadt-purple/20"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-mitadt-text-muted hover:bg-mitadt-bg-secondary"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </label>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-mitadt-red"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-mitadt-purple px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-mitadt-purple-dark disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}