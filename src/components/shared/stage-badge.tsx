"use client";

import { STAGES, reservationStage } from "@/lib/stage";
import { useVertical } from "@/components/layout/vertical-provider";
import {
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_STYLES,
} from "@/lib/constants";
import type { DeliveryStatus, ReservationStatus } from "@/lib/database.types";
import { cn } from "@/lib/utils";

/**
 * Rezervasyon durum rozeti.
 *
 * İŞ TİPİNİ KENDİ OKUYOR: fotoğrafçıda birleşik ekseni (Baskıda, Teslim
 * edildi…), salonda düz durumu gösteriyor. Çağıran yerin bayrak geçirmesi
 * gerekseydi — ki önce öyleydi — her yeni liste ekranında yeniden
 * unutulurdu; nitekim üç ekranda unutulmuştu.
 *
 * İstemci bileşeni olmasının tek sebebi bu: sözlük bağlamdan geliyor.
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
  const sozluk = useVertical();
  const { label, style } = sozluk.usesDelivery
    ? STAGES[reservationStage(status, deliveryStatus)]
    : {
        label: RESERVATION_STATUS_LABELS[status],
        style: RESERVATION_STATUS_STYLES[status],
      };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}
