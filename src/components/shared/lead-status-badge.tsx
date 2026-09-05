import { LEAD_STATUS_LABELS, LEAD_STATUS_STYLES } from "@/lib/constants";
import type { LeadStatus } from "@/lib/database.types";
import { cn } from "@/lib/utils";

/** Talep durumu rozeti — rezervasyon rozetiyle aynı görsel dil. */
export function LeadStatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        LEAD_STATUS_STYLES[status],
        className,
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
