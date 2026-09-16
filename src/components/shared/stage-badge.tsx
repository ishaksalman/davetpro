import { STAGES, reservationStage } from "@/lib/stage";
import type { DeliveryStatus, ReservationStatus } from "@/lib/database.types";
import { cn } from "@/lib/utils";

/**
 * Birleşik durum rozeti — fotoğrafçı listeleri için.
 *
 * StatusBadge yalnızca `status`'a bakıyor; baskıdaki bir işi "Oluşturuldu"
 * gösterirdi. Detayda tek menüye indirilen eksen listede de aynı görünmeli.
 */
export function StageBadge({
  status,
  deliveryStatus,
  className,
}: {
  status: ReservationStatus;
  deliveryStatus: DeliveryStatus | null;
  className?: string;
}) {
  const stage = STAGES[reservationStage(status, deliveryStatus)];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        stage.style,
        className,
      )}
    >
      {stage.label}
    </span>
  );
}
