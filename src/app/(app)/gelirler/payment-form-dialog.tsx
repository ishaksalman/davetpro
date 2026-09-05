"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/shared/combobox";
import { DatePicker } from "@/components/shared/date-picker";
import {
  FormDialog,
  FormField,
  type TriggerButton,
} from "@/components/shared/form-dialog";
import { MoneyInput } from "@/components/shared/money-input";
import {
  enumOptions,
  INCOME_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/constants";
import { formatDateShort, formatMoney } from "@/lib/format";
import { todayISO } from "@/lib/time";
import { paymentSchema, type PaymentInput } from "@/lib/schemas";
import type { ReservationRow } from "@/lib/queries";
import { createPayment } from "./actions";

export function PaymentFormDialog({
  reservations,
  lockedReservation,
  trigger,
  triggerButton,
  suggestedAmount,
}: {
  /** Ödeme bağlanabilecek rezervasyonlar (iptal edilmişler hariç). */
  reservations: ReservationRow[];
  /** Rezervasyon detayından açıldığında seçim kilitlenir. */
  lockedReservation?: ReservationRow;
  trigger?: React.ReactElement;
  triggerButton?: TriggerButton;
  suggestedAmount?: number;
}) {
  const defaultValues: PaymentInput = {
    reservation_id: lockedReservation?.id ?? "none",
    customer_id: lockedReservation?.customer_id ?? "none",
    amount: suggestedAmount ?? 0,
    payment_date: todayISO(),
    method: "nakit",
    category: lockedReservation ? "ara_odeme" : "diger",
    description: "",
  };

  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema) as never,
    defaultValues,
  });

  const reservationId = form.watch("reservation_id");
  const selected = reservations.find((r) => r.id === reservationId);

  // Rezervasyon seçilince müşteri otomatik eşlenir; manuel gelirde boş kalır.
  useEffect(() => {
    if (selected) {
      form.setValue("customer_id", selected.customer_id, { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  const remaining = selected?.balance_amount ?? lockedReservation?.balance_amount;

  return (
    <FormDialog
      trigger={trigger}
      triggerButton={triggerButton}
      title="Tahsilat ekle"
      description="Kaydedilen tahsilatlar sonradan değiştirilemez; hata olursa iptal edip yeni kayıt açarsınız."
      submitLabel="Tahsilatı kaydet"
      form={form}
      defaultValues={defaultValues}
      action={createPayment}
      successMessage="Tahsilat kaydedildi."
    >
      {!lockedReservation && (
        <FormField
          form={form}
          name="reservation_id"
          label="Bağlı rezervasyon"
          description="Rezervasyona bağlamazsanız manuel gelir olarak kaydedilir."
        >
          <Combobox
            id="reservation_id"
            options={[
              { value: "none", label: "Rezervasyona bağlı değil (manuel gelir)" },
              ...reservations.map((r) => ({
                value: r.id,
                label: `${r.customer?.full_name ?? "—"} · ${formatDateShort(r.event_date)}`,
                hint: `${r.venue?.name ?? ""} · Kalan ${formatMoney(r.balance_amount)}`,
              })),
            ]}
            value={form.watch("reservation_id")}
            onChange={(v) => form.setValue("reservation_id", v, { shouldDirty: true })}
            searchPlaceholder="Müşteri veya tarih ara…"
          />
        </FormField>
      )}

      {remaining !== undefined && remaining > 0 && (
        <p className="rounded-lg bg-warning/10 px-3 py-2.5 text-sm text-warning-foreground dark:text-warning">
          Bu rezervasyonda kalan tutar:{" "}
          <strong className="tabular">{formatMoney(remaining)}</strong>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField form={form} name="amount" label="Tutar">
          <MoneyInput
            id="amount"
            value={form.watch("amount")}
            onValueChange={(v) => form.setValue("amount", v, { shouldDirty: true })}
          />
        </FormField>

        <FormField form={form} name="payment_date" label="Tarih">
          <DatePicker
            id="payment_date"
            value={form.watch("payment_date")}
            onChange={(v) =>
              form.setValue("payment_date", v ?? todayISO(), {
                shouldDirty: true,
              })
            }
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField form={form} name="category" label="Kategori">
          <Select
            value={form.watch("category")}
            onValueChange={(v) => form.setValue("category", v as never, { shouldDirty: true })}
          >
            <SelectTrigger id="category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(INCOME_CATEGORY_LABELS).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField form={form} name="method" label="Ödeme yöntemi">
          <Select
            value={form.watch("method")}
            onValueChange={(v) => form.setValue("method", v as never, { shouldDirty: true })}
          >
            <SelectTrigger id="method" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(PAYMENT_METHOD_LABELS).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField form={form} name="description" label="Açıklama">
        <Textarea id="description" rows={2} {...form.register("description")} />
      </FormField>
    </FormDialog>
  );
}
