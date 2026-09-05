import {
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_STYLES,
} from "@/lib/constants";
import type { ReservationStatus } from "@/lib/database.types";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: ReservationStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        RESERVATION_STATUS_STYLES[status],
        className,
      )}
    >
      {RESERVATION_STATUS_LABELS[status]}
    </span>
  );
}
