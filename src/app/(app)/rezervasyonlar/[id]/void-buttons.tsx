"use client";

import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoidDialog } from "@/components/shared/void-dialog";
import { voidPayment } from "../../gelirler/actions";
import { voidExpense } from "../../giderler/actions";

const triggerButton = (label: string) => (
  <Button variant="ghost" size="icon" className="size-9 text-muted-foreground">
    <Ban className="size-3.5" />
    <span className="sr-only">{label}</span>
  </Button>
);

export function VoidPaymentButton({ id }: { id: string }) {
  return (
    <VoidDialog
      title="Tahsilat iptal edilsin mi?"
      description="Kayıt silinmez; iptal edilmiş olarak işaretlenir ve kalan tutar yeniden hesaplanır."
      onVoid={(reason) => voidPayment(id, reason)}
      successMessage="Tahsilat iptal edildi."
      trigger={triggerButton("Tahsilatı iptal et")}
    />
  );
}

export function VoidExpenseButton({ id }: { id: string }) {
  return (
    <VoidDialog
      title="Gider iptal edilsin mi?"
      description="Kayıt silinmez; iptal edilmiş olarak işaretlenir ve kârlılık hesabından düşülür."
      onVoid={(reason) => voidExpense(id, reason)}
      successMessage="Gider iptal edildi."
      trigger={triggerButton("Gideri iptal et")}
    />
  );
}
