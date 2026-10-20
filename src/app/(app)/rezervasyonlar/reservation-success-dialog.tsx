"use client";

import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, FileText, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateLong, formatTimeRange } from "@/lib/format";

export type CreatedReservation = {
  id: string;
  customerName: string | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  venueName: string | null;
};

const ShowCreatedContext = createContext<(r: CreatedReservation) => void>(
  () => {},
);

/**
 * Onay penceresini uygulama düzeyinde tutuyor.
 *
 * Pencere rezervasyon formunun içinde dursaydı, formu açan düğmeyle birlikte
 * kaybolabiliyordu: liste boşken çıkan "Rezervasyon oluştur" düğmesi ilk
 * kayıttan sonra ekrandan kalkıyor ve pencereyi de götürüyordu.
 */
export function ReservationSuccessProvider({
  showFinance,
  children,
}: {
  showFinance: boolean;
  children: React.ReactNode;
}) {
  const [created, setCreated] = useState<CreatedReservation | null>(null);
  return (
    <ShowCreatedContext.Provider value={setCreated}>
      {children}
      <ReservationSuccessDialog
        reservation={created}
        showFinance={showFinance}
        onClose={() => setCreated(null)}
      />
    </ShowCreatedContext.Provider>
  );
}

/** Yeni rezervasyonun onay penceresini açar. */
export function useShowCreatedReservation() {
  return useContext(ShowCreatedContext);
}

/**
 * Yeni rezervasyondan sonra açılan onay penceresi.
 *
 * Kayıttan sonraki doğal adım sözleşme; onu öne çıkarıyor. Sözleşme finans
 * yetkisi istediği için yetkisiz kullanıcıya onun yerine rezervasyonun
 * kendisi öneriliyor.
 */
function ReservationSuccessDialog({
  reservation,
  showFinance,
  onClose,
}: {
  reservation: CreatedReservation | null;
  showFinance: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={reservation !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {reservation && (
          <div className="flex flex-col items-center gap-4 pt-2 text-center">
            <span className="grid size-14 animate-in place-items-center rounded-full bg-success/12 text-success duration-500 zoom-in-50 fade-in-0 motion-reduce:animate-none">
              <Check className="size-7" strokeWidth={2.5} />
            </span>

            <div className="space-y-1.5">
              <DialogTitle className="text-lg">Rezervasyon oluşturuldu</DialogTitle>
              <DialogDescription>
                {reservation.customerName
                  ? `${reservation.customerName} için kayıt alındı.`
                  : "Kayıt alındı."}
              </DialogDescription>
            </div>

            <div className="w-full rounded-lg bg-muted/60 px-4 py-3 text-left text-sm">
              <p className="flex items-center gap-2 font-medium">
                <CalendarDays className="size-4 text-muted-foreground" />
                {formatDateLong(reservation.eventDate)}
              </p>
              <p className="mt-0.5 pl-6 text-muted-foreground">
                <span className="tabular">
                  {formatTimeRange(reservation.startTime, reservation.endTime)}
                </span>
                {reservation.venueName && ` · ${reservation.venueName}`}
              </p>
            </div>

            <div className="grid w-full gap-2">
              {showFinance ? (
                <Button asChild>
                  <Link
                    href={`/rezervasyonlar/${reservation.id}/sozlesme`}
                    onClick={onClose}
                  >
                    <FileText />
                    Sözleşme oluştur
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href={`/rezervasyonlar/${reservation.id}`} onClick={onClose}>
                    <FileText />
                    Rezervasyonu aç
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href="/rezervasyonlar" onClick={onClose}>
                  <List />
                  Rezervasyonlarım
                </Link>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
