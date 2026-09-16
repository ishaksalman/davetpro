"use client";

import { useTransition } from "react";
import { Check, ChevronDown, Loader2, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DELIVERY_STATUS_FLOW, DELIVERY_STATUS_LABELS } from "@/lib/constants";
import type { DeliveryStatus } from "@/lib/database.types";
import { updateReservationStage } from "../actions";

/**
 * Teslimat panosundaki aşama menüsü.
 *
 * Detaydaki StageMenu ile AYNI eylemi çağırıyor: "Teslim edildi" iki yerden
 * de aynı kolonları yazsın diye. Ayrı bir yazma yolu bıraksaydık panodan
 * teslim edilen iş 'tamamlandi'ya geçmez, detaydan edilen geçerdi.
 *
 * Aşamalar sıralı ama zorlayıcı değil — albüm satmayan fotoğrafçı baskı
 * adımını atlayabiliyor.
 */
export function DeliveryMenu({
  reservationId,
  status,
}: {
  reservationId: string;
  status: DeliveryStatus | null;
}) {
  const [pending, startTransition] = useTransition();

  function change(next: DeliveryStatus | null) {
    if (next === status) return;
    startTransition(async () => {
      const result = await updateReservationStage(
        reservationId,
        next ?? "olusturuldu",
      );
      if (result.ok) toast.success("Teslim aşaması güncellendi.");
      else toast.error(result.error);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <PackageCheck />}
          {status ? DELIVERY_STATUS_LABELS[status] : "Teslim aşaması"}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Teslim aşaması</DropdownMenuLabel>
        {DELIVERY_STATUS_FLOW.map((value) => (
          <DropdownMenuItem key={value} onSelect={() => change(value)}>
            <Check className={value === status ? "opacity-100" : "opacity-0"} />
            {DELIVERY_STATUS_LABELS[value]}
          </DropdownMenuItem>
        ))}
        {status && (
          <>
            <DropdownMenuSeparator />
            {/* Yanlışlıkla başlatılan akış geri alınabilmeli. */}
            <DropdownMenuItem onSelect={() => change(null)}>
              <Check className="opacity-0" />
              Henüz başlamadı
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
