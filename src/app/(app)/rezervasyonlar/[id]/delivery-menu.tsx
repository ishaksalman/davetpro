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
import { updateDeliveryStatus } from "../actions";

/**
 * Çekim sonrası teslim aşaması.
 *
 * Rezervasyon durumundan ayrı: iş "tamamlandı" olsa da albüm hâlâ baskıda
 * olabilir. Aşamalar sıralı ama zorlayıcı değil — albüm satmayan fotoğrafçı
 * baskı adımını atlayabiliyor.
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
      const result = await updateDeliveryStatus(reservationId, next);
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
