"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormDialog,
  FormField,
  type TriggerButton,
} from "@/components/shared/form-dialog";
import { customerSchema, type CustomerInput } from "@/lib/schemas";
import type { Customer } from "@/lib/database.types";
import { saveCustomer } from "./actions";

export function CustomerFormDialog({
  customer,
  trigger,
  triggerButton,
}: {
  customer?: Customer;
  trigger?: React.ReactElement;
  triggerButton?: TriggerButton;
}) {
  const defaultValues: CustomerInput = {
    id: customer?.id,
    full_name: customer?.full_name ?? "",
    phone: customer?.phone ?? "",
    phone2: customer?.phone2 ?? "",
    email: customer?.email ?? "",
    address: customer?.address ?? "",
    national_id: customer?.national_id ?? "",
    notes: customer?.notes ?? "",
  };

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema) as never,
    defaultValues,
  });

  return (
    <FormDialog
      trigger={trigger}
      triggerButton={triggerButton}
      title={customer ? "Müşteriyi düzenle" : "Yeni müşteri"}
      form={form}
      defaultValues={defaultValues}
      action={saveCustomer}
      successMessage={customer ? "Müşteri güncellendi." : "Müşteri eklendi."}
    >
      <FormField form={form} name="full_name" label="Ad soyad">
        <Input
          id="full_name"
          placeholder="Zeynep & Ali Yılmaz"
          {...form.register("full_name")}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField form={form} name="phone" label="Telefon">
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            placeholder="0532 111 22 33"
            {...form.register("phone")}
          />
        </FormField>

        <FormField form={form} name="phone2" label="İkinci telefon">
          <Input
            id="phone2"
            type="tel"
            inputMode="tel"
            placeholder="Opsiyonel"
            {...form.register("phone2")}
          />
        </FormField>
      </div>

      <FormField form={form} name="email" label="E-posta">
        <Input
          id="email"
          type="email"
          placeholder="Opsiyonel"
          {...form.register("email")}
        />
      </FormField>

      <FormField form={form} name="address" label="Adres">
        <Textarea
          id="address"
          rows={2}
          placeholder="Opsiyonel — sözleşmede kullanılır"
          {...form.register("address")}
        />
      </FormField>

      <FormField form={form} name="national_id" label="T.C. Kimlik No">
        <Input
          id="national_id"
          inputMode="numeric"
          maxLength={11}
          placeholder="Opsiyonel"
          {...form.register("national_id")}
        />
        {/* KVKK: kimlik numarası zorunlu değil. Sözleşmede taraf kimliğinin
            yazılmasını isteyen işletmeler için opsiyonel bırakıldı. */}
        <p className="text-xs text-muted-foreground">
          Zorunlu değildir. Yalnızca sözleşmede kimlik bilgisi isteniyorsa
          doldurun; KVKK gereği gerekmedikçe bu alanı boş bırakmanız önerilir.
        </p>
      </FormField>

      <FormField form={form} name="notes" label="Notlar">
        <Textarea
          id="notes"
          rows={3}
          placeholder="Görüşme notları, tercihler…"
          {...form.register("notes")}
        />
      </FormField>
    </FormDialog>
  );
}
