import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, RotateCcw, XCircle } from "lucide-react";
import type { SubmissionStatus } from "@/lib/types";

const STATUS_META: Record<
  SubmissionStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  },
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-100 text-red-800 ring-1 ring-inset ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30",
  },
  NEEDS_REVISION: {
    label: "Needs revision",
    icon: RotateCcw,
    className: "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: SubmissionStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <Badge variant="outline" className={`gap-1 ${meta.className} ${className ?? ""}`}>
      <Icon className="size-3" aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function statusLabel(status: SubmissionStatus) {
  return STATUS_META[status].label;
}
