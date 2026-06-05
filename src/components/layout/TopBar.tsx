import { Menu } from "lucide-react";
import type { SessionUser } from "@/types/alphaai";

export function TopBar({
  title,
  user,
  onMenu,
}: {
  title: string;
  user: SessionUser;
  onMenu: () => void;
}) {
  const initials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <header className="bg-mitadt-topbar sticky top-0 z-20 flex h-14 items-center gap-3 px-3 text-white shadow-sm sm:px-4 lg:h-16 lg:px-6">
      <button
        type="button"
        onClick={onMenu}
        className="rounded p-1.5 text-white/80 hover:bg-white/10 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="truncate font-display text-sm font-bold tracking-tight sm:text-base lg:text-lg">
        {title}
      </h1>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <div className="hidden text-right text-xs leading-tight sm:block">
          <div className="font-semibold">{user.name}</div>
          <div className="text-white/70">{user.username}</div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-mitadt-purple-dark sm:h-9 sm:w-9 sm:text-sm">
          {initials || "MA"}
        </div>
      </div>
    </header>
  );
}