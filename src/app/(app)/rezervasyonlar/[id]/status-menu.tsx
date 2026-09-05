"use client";

import { useTransition } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RESERVATION_STATUS_FLOW,
  RESERVATION_STATUS_LABELS,
} from "@/lib/constants";
import type { ReservationStatus } from "@/lib/database.types";
import { updateReservationStatus } from "../actions";

/** Durum değişikliği en sık yapılan işlem olduğu için tek tıkla erişilebilir. */
export function ReservationStatusMenu({
  reservationId,
  status,
}: {
  reservationId: string;
  status: ReservationStatus;
}) {
  const [pending, startTransition] = useTransition();

  function change(next: ReservationStatus) {
    if (next === status) return;
    startTransition(async () => {
      const result = await updateReservationStatus(reservationId, next);
      if (result.ok) toast.success("Durum güncellendi.");
      else toast.error(result.error);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {RESERVATION_STATUS_LABELS[status]}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Rezervasyon durumu</DropdownMenuLabel>
        {RESERVATION_STATUS_FLOW.map((v) => ({ value: v, label: RESERVATION_STATUS_LABELS[v] })).map((option) => (
          <DropdownMenuItem key={option.value} onSelect={() => change(option.value)}>
            <Check
              className={option.value === status ? "opacity-100" : "opacity-0"}
            />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
