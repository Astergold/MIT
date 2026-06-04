import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-extrabold leading-tight text-mitadt-purple-dark sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-xs text-mitadt-text-muted sm:text-sm">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="-mx-1 flex flex-wrap items-center gap-2 px-1 sm:mx-0 sm:px-0">
          {actions}
        </div>
      )}
    </div>
  );
}