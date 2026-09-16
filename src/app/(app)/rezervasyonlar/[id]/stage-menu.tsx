"use client";

import { useTransition } from "react";
import { Check, ChevronDown, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { STAGES, STAGE_FLOW, reservationStage, type Stage } from "@/lib/stage";
import type { DeliveryStatus, ReservationStatus } from "@/lib/database.types";
import { updateReservationStage } from "../actions";

/**
 * Fotoğrafçıda tek durum menüsü.
 *
 * Eskiden iki ayrı menü vardı (rezervasyon durumu + teslim aşaması) ve
 * ikisi de aynı soruyu farklı kelimelerle soruyordu: "bu iş nerede?".
 * Tek eksene indirildi; iptal ayrı bir butonda çünkü o bir ilerleme adımı
 * değil, akıştan çıkış.
 */
export function StageMenu({
  reservationId,
  status,
  deliveryStatus,
}: {
  reservationId: string;
  status: ReservationStatus;
  deliveryStatus: DeliveryStatus | null;
}) {
  const [pending, startTransition] = useTransition();
  const current = reservationStage(status, deliveryStatus);
  const iptalli = current === "iptal_edildi";

  function change(next: Stage) {
    if (next === current) return;
    startTransition(async () => {
      const result = await updateReservationStage(reservationId, next);
      if (result.ok) toast.success("Durum güncellendi.");
      else toast.error(result.error);
    });
  }

  return (
    <>
      {/* İptal, menünün SOLUNDA: geri dönüşü olan bir adım değil, ayrı
          dursun ki yanlışlıkla seçilmesin. */}
      {!iptalli && (
        <ConfirmDialog
          title="Rezervasyon iptal edilsin mi?"
          description={
            <>
              Durum <strong>İptal edildi</strong> olarak işaretlenecek. Kayıt
              silinmiyor; tahsilat ve giderler olduğu gibi duruyor. Gerekirse
              durum menüsünden geri alabilirsiniz.
            </>
          }
          confirmLabel="İptal et"
          successMessage="Rezervasyon iptal edildi."
          onConfirm={() => updateReservationStage(reservationId, "iptal_edildi")}
          trigger={
            <Button variant="outline" disabled={pending}>
              <XCircle />
              İptal et
            </Button>
          }
        />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {STAGES[current].label}
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Durum</DropdownMenuLabel>
          {STAGE_FLOW.map((value) => (
            <DropdownMenuItem key={value} onSelect={() => change(value)}>
              <Check className={value === current ? "opacity-100" : "opacity-0"} />
              {STAGES[value].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
