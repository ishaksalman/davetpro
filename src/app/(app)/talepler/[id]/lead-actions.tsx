"use client";

import { Ban, ArrowRightLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LeadFormDialog } from "../lead-form-dialog";
import { ConvertDialog } from "./convert-dialog";
import { LostDialog } from "./lost-dialog";
import { reopenLead } from "../actions";
import type {
  Package,
  Profile,
  Quote,
  Venue,
  VenueHold,
} from "@/lib/database.types";
import type { LeadRow } from "@/lib/leads";

/** Talep detayı üst şeridindeki eylemler. */
export function LeadActions({
  lead,
  venues,
  packages,
  members,
  customerName,
  customerPhone,
  activeHold,
  quotes,
  acceptedQuoteId,
  showFinance,
}: {
  lead: LeadRow;
  venues: Venue[];
  packages: Package[];
  members: Pick<Profile, "id" | "full_name">[];
  customerName: string;
  customerPhone: string;
  activeHold: VenueHold | null;
  quotes: Quote[];
  acceptedQuoteId: string | null;
  showFinance: boolean;
}) {
  const converted = Boolean(lead.reservation_id);

  return (
    <>
      {!converted && lead.status === "kaybedildi" && (
        <ConfirmDialog
          destructive={false}
          trigger={
            <Button variant="outline">
              <RotateCcw />
              Yeniden aç
            </Button>
          }
          title="Talebi yeniden aç"
          description="Talep tekrar satış hattına alınır ve kaybetme nedeni temizlenir."
          confirmLabel="Yeniden aç"
          successMessage="Talep yeniden açıldı."
          onConfirm={() => reopenLead(lead.id)}
        />
      )}

      {!converted && lead.status !== "kaybedildi" && (
        <LostDialog
          leadId={lead.id}
          trigger={
            <Button variant="ghost" className="text-muted-foreground">
              <Ban />
              <span className="hidden sm:inline">Kaybedildi</span>
            </Button>
          }
        />
      )}

      {!converted && showFinance && (
        <ConvertDialog
          lead={lead}
          venues={venues}
          packages={packages}
          quotes={quotes}
          acceptedQuoteId={acceptedQuoteId}
          activeHold={activeHold}
          trigger={
            <Button>
              <ArrowRightLeft />
              <span className="hidden sm:inline">Rezervasyona dönüştür</span>
              <span className="sm:hidden">Dönüştür</span>
            </Button>
          }
        />
      )}

      {!converted && (
        <LeadFormDialog
          lead={lead}
          customerName={customerName}
          customerPhone={customerPhone}
          venues={venues}
          packages={packages}
          members={members}
          triggerButton={{
            label: "Düzenle",
            icon: "pencil",
            variant: "outline",
            labelHiddenOnMobile: true,
          }}
        />
      )}
    </>
  );
}
