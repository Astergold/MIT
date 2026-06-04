import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Megaphone,
  Phone,
  Bot,
  LogOut,
  Mic,
  X,
} from "lucide-react";
import { logoutFn } from "@/lib/auth.functions";
import { getHealth } from "@/lib/dograh.functions";
import { DASHBOARD_CONFIG } from "@/config/dashboard.config";
import type { SessionUser } from "@/types/dograh";

type NavItem = {
  to: "/dashboard" | "/dashboard/campaigns" | "/dashboard/calls" | "/dashboard/agents";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};
const items: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/dashboard/calls", label: "Calls", icon: Phone },
  { to: "/dashboard/agents", label: "Agents", icon: Bot },
];

export function Sidebar({
  user,
  open,
  onClose,
}: {
  user: SessionUser;
  open: boolean;
  onClose: () => void;
}) {
  const logout = useServerFn(logoutFn);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const healthFn = useServerFn(getHealth);
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => healthFn(),
    refetchInterval: DASHBOARD_CONFIG.HEALTH_CHECK_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });
  const online = health?.ok === true;

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[color:var(--mitadt-purple-dark)] text-white transition-transform lg:static lg:translate-x-0 " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-mitadt-purple-dark">
              <span className="font-display text-sm font-extrabold">MIT</span>
            </div>
            <div>
              <div className="font-display text-sm font-extrabold leading-tight">
                {DASHBOARD_CONFIG.SHORT_NAME}
              </div>
              <div className="text-[11px] text-white/60">
                AI Voice Platform
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/70 hover:bg-white/10 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-5 mb-3 h-px bg-white/15" />

        <nav className="flex-1 space-y-1 px-3" aria-label="Main">
          {items.map((it) => {
            const active = it.exact
              ? path === it.to
              : path === it.to || path.startsWith(it.to + "/");
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={onClose}
                className={
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition " +
                  (active
                    ? "bg-[rgba(221,114,40,0.15)] text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white")
                }
              >
                {active && (
                  <span className="absolute left-0 top-1.5 h-[calc(100%-12px)] w-1 rounded-r bg-mitadt-orange" />
                )}
                <it.icon className="h-4 w-4" />
                <span className="nav-label">{it.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-white/15 px-5 py-4 text-xs text-white/70">
          <div className="flex items-center gap-2">
            <span
              className={
                "inline-block h-2 w-2 rounded-full " +
                (online ? "bg-emerald-400" : "bg-mitadt-red")
              }
            />
            <span>{online ? "System Online" : "System Offline"}</span>
            {health?.ok && health.data?.version && (
              <span className="ml-auto text-white/40">
                v{health.data.version}
              </span>
            )}
          </div>
          <div className="truncate">
            Signed in as <span className="text-white/90">{user.username}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

export function MobileBottomNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-mitadt-border bg-white py-2 lg:hidden">
      {items.map((it) => {
        const active = it.exact
          ? path === it.to
          : path === it.to || path.startsWith(it.to + "/");
        return (
          <Link
            key={it.to}
            to={it.to}
            className={
              "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider " +
              (active ? "text-mitadt-purple" : "text-mitadt-text-muted")
            }
          >
            <it.icon className="h-5 w-5" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

export { Mic };