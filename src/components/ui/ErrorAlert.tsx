import { AlertTriangle } from "lucide-react";

export function ErrorAlert({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error");
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-mitadt-red" />
      <div className="flex-1">
        <div className="font-semibold text-mitadt-red">
          Could not load data
        </div>
        <div className="mt-0.5 text-sm text-red-900/80">{message}</div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1 text-sm font-medium text-mitadt-red hover:bg-red-50"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}