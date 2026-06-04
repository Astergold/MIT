import { cn } from "@/lib/utils";

const VARIANTS: Record<string, string> = {
  draft: "bg-gray-200 text-gray-700",
  running: "bg-amber-100 text-amber-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-600",
  untouched: "bg-gray-100 text-gray-600",
  in_call: "bg-sky-100 text-sky-800",
  interested: "bg-emerald-100 text-emerald-800",
  agreed: "bg-emerald-100 text-emerald-800",
  not_interested: "bg-red-100 text-red-800",
  callback: "bg-orange-100 text-orange-800",
};

export function StatusBadge({
  status,
  label,
  pulse,
}: {
  status: string;
  label?: string;
  pulse?: boolean;
}) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  const cls = VARIANTS[key] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        cls,
      )}
    >
      {pulse && <span className="live-dot" />}
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

export function dispositionBadge(d?: string): {
  status: string;
  label: string;
} {
  if (!d) return { status: "pending", label: "—" };
  const u = d.toUpperCase();
  if (u.includes("NOT_INTEREST"))
    return { status: "not_interested", label: "Not Interested" };
  if (u.includes("INTEREST"))
    return { status: "interested", label: "Interested" };
  if (u.includes("CALLBACK"))
    return { status: "callback", label: "Callback" };
  if (u.includes("AGREED")) return { status: "agreed", label: "Agreed" };
  if (u.includes("FAIL")) return { status: "failed", label: "Failed" };
  return { status: "completed", label: d };
}