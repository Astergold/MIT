import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export function RefreshIndicator({
  updatedAt,
  onRefresh,
  isFetching,
  className,
}: {
  updatedAt?: number;
  onRefresh?: () => void;
  isFetching?: boolean;
  className?: string;
}) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);
  const label = updatedAt ? relativeTime(updatedAt) : "syncing…";
  return (
    <button
      type="button"
      onClick={onRefresh}
      className={
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-mitadt-text-muted hover:bg-mitadt-bg-secondary " +
        (className ?? "")
      }
      title="Refresh"
    >
      <RefreshCw
        className={"h-3.5 w-3.5 " + (isFetching ? "animate-spin" : "")}
      />
      Updated {label}
    </button>
  );
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h} h ago`;
}