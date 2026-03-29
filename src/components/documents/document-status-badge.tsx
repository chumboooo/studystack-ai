import { cn } from "@/lib/utils";

type DocumentStatus = "completed" | "failed" | "pending" | null | undefined;

const statusStyles: Record<NonNullable<DocumentStatus>, string> = {
  completed: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  failed: "border-rose-400/20 bg-rose-400/10 text-rose-200",
  pending: "border-amber-400/20 bg-amber-400/10 text-amber-200",
};

const statusLabels: Record<NonNullable<DocumentStatus>, string> = {
  completed: "Ready",
  failed: "Needs attention",
  pending: "Processing",
};

export function getDocumentStatusLabel(status: DocumentStatus) {
  return status ? statusLabels[status] : statusLabels.pending;
}

export function DocumentStatusBadge({
  status,
  className,
}: {
  status: DocumentStatus;
  className?: string;
}) {
  const normalizedStatus = status ?? "pending";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        statusStyles[normalizedStatus],
        className,
      )}
    >
      {statusLabels[normalizedStatus]}
    </span>
  );
}
