"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog, FormField, type TriggerButton } from "@/components/shared/form-dialog";
import { formatDate } from "@/lib/format";
import { extendAccessSchema, type ExtendAccessInput } from "@/lib/schemas";
import { YEARLY_DAYS } from "@/lib/subscription";
import type { AdminBusinessRow } from "@/lib/database.types";
import { extendAccess } from "./actions";

/**
 * Hazır süreler — elle yazmak yerine tek tık.
 *
 * Satılan tek şey yıllık abonelik; kısa süreler jest veya telafi için
 * (gecikmiş havale, yaşanan bir aksaklık) duruyor.
 */
const KISAYOLLAR = [
  { days: 7, label: "1 hafta" },
  { days: 30, label: "1 ay" },
  { days: 90, label: "3 ay" },
  { days: YEARLY_DAYS, label: "1 yıl" },
];

export function ExtendAccessDialog({
  row,
  trigger,
  triggerButton,
}: {
  row: AdminBusinessRow;
  trigger?: React.ReactElement;
  triggerButton?: TriggerButton;
}) {
  const defaultValues: ExtendAccessInput = {
    business_id: row.business_id,
    // Satılan şey yıllık abonelik; varsayılan da o olsun.
    days: YEARLY_DAYS,
    note: "",
  };

  const form = useForm<ExtendAccessInput>({
    resolver: zodResolver(extendAccessSchema) as never,
    defaultValues,
  });

  const suresiDoldu = new Date(row.access_until).getTime() <= Date.now();

  return (
    <FormDialog
      trigger={trigger}
      triggerButton={triggerButton}
      title="Süre uzat"
      description={`${row.business_name} — mevcut bitiş ${formatDate(row.access_until)}.`}
      submitLabel="Uzat"
      form={form}
      defaultValues={defaultValues}
      action={extendAccess}
      successMessage="Süre uzatıldı."
    >
      <FormField
        form={form}
        name="days"
        label="Eklenecek gün"
        description={
          suresiDoldu
            ? "Bu hesabın süresi dolmuş; eklenen gün bugünden başlar."
            : "Mevcut bitiş tarihinin üstüne eklenir."
        }
      >
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {KISAYOLLAR.map((k) => (
              <Button
                key={k.days}
                type="button"
                variant={form.watch("days") === k.days ? "default" : "outline"}
                size="sm"
                onClick={() => form.setValue("days", k.days, { shouldDirty: true })}
              >
                {k.label}
              </Button>
            ))}
          </div>
          <Input id="days" inputMode="numeric" {...form.register("days")} />
        </div>
      </FormField>

      <FormField
        form={form}
        name="note"
        label="Not"
        description="Yalnızca sizin göreceğiniz kayıt — ör. havale tarihi."
      >
        <Input id="note" placeholder="12.09 havale, 3 ay" {...form.register("note")} />
      </FormField>
    </FormDialog>
  );
}
