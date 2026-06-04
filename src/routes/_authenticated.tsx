import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { meFn } from "@/lib/auth.functions";
import { Sidebar, MobileBottomNav } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    try {
      const res = await meFn();
      if (!res.user) {
        throw redirect({
          to: "/login",
          search: { redirect: location.href },
        });
      }
      return { user: res.user };
    } catch (e) {
      // re-throw redirect
      if (e && typeof e === "object" && "isRedirect" in e) throw e;
      throw redirect({ to: "/login" });
    }
  },
  component: AuthShell,
});

function AuthShell() {
  const me = useServerFn(meFn);
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => me(),
    staleTime: 60_000,
  });
  const [open, setOpen] = useState(false);

  if (isLoading || !data?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-mitadt-purple" />
      </div>
    );
  }

  if (!data.user) {
    navigate({ to: "/login" });
    return null;
  }

  return (
    <div className="flex min-h-screen bg-mitadt-bg-secondary">
      <Sidebar
        user={data.user}
        open={open}
        onClose={() => setOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title="MIT-ADT AI Voice Platform"
          user={data.user}
          onMenu={() => setOpen(true)}
        />
        <main className="flex-1 px-3 pb-24 pt-4 sm:px-4 sm:pt-6 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}