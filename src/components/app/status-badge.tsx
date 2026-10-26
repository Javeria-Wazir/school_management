import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SheetStatus = "not_started" | "draft" | "submitted" | "under_review" | "approved" | "returned";
type ResultStatus = "open" | "class_approved" | "final_approved";

const SHEET: Record<SheetStatus, { label: string; className: string }> = {
  not_started: { label: "Not started", className: "text-muted-foreground" },
  draft: { label: "Draft", className: "border-sky-500/50 text-sky-700 dark:text-sky-400" },
  submitted: { label: "Submitted · awaiting review", className: "border-amber-500/60 text-amber-700 dark:text-amber-400" },
  under_review: { label: "Under review", className: "border-amber-500/60 text-amber-700 dark:text-amber-400" },
  approved: { label: "Approved", className: "border-emerald-500/60 text-emerald-700 dark:text-emerald-400" },
  returned: { label: "Returned for correction", className: "border-red-500/60 text-red-700 dark:text-red-400" },
};

const RESULT: Record<ResultStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "text-muted-foreground" },
  class_approved: { label: "Approved by class teacher", className: "border-amber-500/60 text-amber-700 dark:text-amber-400" },
  final_approved: { label: "Final · approved", className: "border-emerald-500/60 text-emerald-700 dark:text-emerald-400" },
};

export function SheetStatusBadge({ status, className }: { status: SheetStatus; className?: string }) {
  const s = SHEET[status];
  return (
    <Badge variant="outline" className={cn(s.className, className)}>
      {s.label}
    </Badge>
  );
}

export function ResultStatusBadge({ status, className }: { status: ResultStatus; className?: string }) {
  const s = RESULT[status];
  return (
    <Badge variant="outline" className={cn(s.className, className)}>
      {s.label}
    </Badge>
  );
}
