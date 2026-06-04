import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-mitadt-border bg-white p-3 shadow-sm sm:p-5",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:content-['']",
        "before:bg-mitadt-hero",
      )}
    >
      <div className="flex items-start justify-between gap-2 pl-2 sm:gap-3">
        <div className="min-w-0">
          <div className="nav-label text-mitadt-text-muted">{label}</div>
          <div className="mt-1.5 font-display text-2xl font-extrabold text-mitadt-purple-dark sm:mt-2 sm:text-3xl">
            {loading ? (
              <span className="inline-block h-7 w-20 animate-pulse rounded bg-mitadt-border" />
            ) : (
              value
            )}
          </div>
          {hint && (
            <div className="mt-1 text-xs text-mitadt-text-muted">{hint}</div>
          )}
        </div>
        {Icon && (
          <div className="hidden rounded-lg bg-mitadt-bg-secondary p-2 text-mitadt-purple sm:block">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}