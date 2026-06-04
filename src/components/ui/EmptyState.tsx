import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-mitadt-border bg-mitadt-bg-secondary px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 rounded-full bg-white p-4 text-mitadt-purple shadow-sm">
          <Icon className="h-8 w-8" />
        </div>
      )}
      <h3 className="font-display text-lg font-bold text-mitadt-purple-dark">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-mitadt-text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}