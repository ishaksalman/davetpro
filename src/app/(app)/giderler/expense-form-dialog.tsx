"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
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
import { enumOptions, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatDateShort } from "@/lib/format";
import { todayISO } from "@/lib/time";
import { expenseSchema, type ExpenseInput } from "@/lib/schemas";
import type { ExpenseCategory } from "@/lib/database.types";
import type { ReservationRow } from "@/lib/queries";
import { createExpense } from "./actions";

export function ExpenseFormDialog({
  categories,
  reservations,
  lockedReservation,
  trigger,
  triggerButton,
}: {
  categories: ExpenseCategory[];
  reservations: ReservationRow[];
  lockedReservation?: ReservationRow;
  trigger?: React.ReactElement;
  triggerButton?: TriggerButton;
}) {
  const activeCategories = categories.filter((c) => c.is_active);

  const defaultValues: ExpenseInput = {
    category_id: activeCategories[0]?.id ?? "",
    reservation_id: lockedReservation?.id ?? "none",
    amount: 0,
    expense_date: todayISO(),
    method: "nakit",
    description: "",
    vendor: "",
  };

  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema) as never,
    defaultValues,
  });

  return (
    <FormDialog
      trigger={trigger}
      triggerButton={triggerButton}
      title="Gider ekle"
      description="Gideri bir organizasyona bağlarsanız o organizasyonun kârlılığına yansır."
      submitLabel="Gideri kaydet"
      form={form}
      defaultValues={defaultValues}
      action={createExpense}
      successMessage="Gider kaydedildi."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField form={form} name="amount" label="Tutar">
          <MoneyInput
            id="amount"
            value={form.watch("amount")}
            onValueChange={(v) => form.setValue("amount", v, { shouldDirty: true })}
          />
        </FormField>

        <FormField form={form} name="expense_date" label="Tarih">
          <DatePicker
            id="expense_date"
            value={form.watch("expense_date")}
            onChange={(v) =>
              form.setValue("expense_date", v ?? todayISO(), {
                shouldDirty: true,
              })
            }
          />
        </FormField>
      </div>

      <FormField form={form} name="category_id" label="Kategori">
        <Select
          value={form.watch("category_id")}
          onValueChange={(v) => form.setValue("category_id", v, { shouldDirty: true })}
        >
          <SelectTrigger id="category_id" className="w-full">
            <SelectValue placeholder="Kategori seçin" />
          </SelectTrigger>
          <SelectContent>
            {activeCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {!lockedReservation && (
        <FormField
          form={form}
          name="reservation_id"
          label="Bağlı organizasyon"
          description="Genel giderler (kira, elektrik…) için boş bırakın."
        >
          <Combobox
            id="reservation_id"
            options={[
              { value: "none", label: "Organizasyona bağlı değil (genel gider)" },
              ...reservations.map((r) => ({
                value: r.id,
                label: `${r.customer?.full_name ?? "—"} · ${formatDateShort(r.event_date)}`,
                hint: r.venue?.name ?? undefined,
              })),
            ]}
            value={form.watch("reservation_id")}
            onChange={(v) => form.setValue("reservation_id", v, { shouldDirty: true })}
            searchPlaceholder="Müşteri veya tarih ara…"
          />
        </FormField>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField form={form} name="vendor" label="Tedarikçi">
          <Input id="vendor" placeholder="Opsiyonel" {...form.register("vendor")} />
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
        <Textarea
          id="description"
          rows={2}
          placeholder="Örn. 400 kişilik menü ödemesi"
          {...form.register("description")}
        />
      </FormField>
    </FormDialog>
  );
}
