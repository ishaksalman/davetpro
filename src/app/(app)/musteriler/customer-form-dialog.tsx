"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ChevronDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { saveCustomer } from "./actions";

/** Katlanır bölümdeki alanlar; hata varsa bölüm kendiliğinden açılıyor. */
const DETAIL_FIELDS = ["email", "address", "national_id"] as const;

export function CustomerFormDialog({
  customer,
  trigger,
  triggerButton,
  open,
  onOpenChange,
  onCreated,
  onSaved,
  detailsOpen: detailsOpenInitially,
}: {
  customer?: Customer;
  trigger?: React.ReactElement;
  triggerButton?: TriggerButton;
  /** Tetikleyici olmadan dışarıdan açmak için (ör. rezervasyon formu). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Yeni müşteri eklendiğinde kimliğini bildirir; çağıran onu seçebilir. */
  onCreated?: (id: string) => void;
  /** Kayıt (ekleme ya da düzenleme) başarılı olduğunda. */
  onSaved?: () => void;
  /**
   * "Sözleşme ve iletişim bilgileri" bölümü açık başlasın — sözleşme
   * ekranından eksik bilgiyi tamamlamak için açıldığında.
   */
  detailsOpen?: boolean;
}) {
  const defaultValues: CustomerInput = {
    id: customer?.id,
    full_name: customer?.full_name ?? "",
    contract_name: customer?.contract_name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    address: customer?.address ?? "",
    national_id: customer?.national_id ?? "",
    notes: customer?.notes ?? "",
  };

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema) as never,
    defaultValues,
  });

  // Düzenlemede bu alanlardan biri doluysa bölüm açık gelsin; bilgi saklı
  // durmasın.
  const [detailsOpen, setDetailsOpen] = useState(
    detailsOpenInitially ??
      Boolean(customer?.email || customer?.address || customer?.national_id),
  );
  const detailError = DETAIL_FIELDS.some((f) => form.formState.errors[f]);
  const showDetails = detailsOpen || detailError;

  /*
   * Sözleşmede geçecek ad, ad soyadı izliyor — kullanıcı ayrıca bir ad
   * yazana kadar. Tek kişilik kayıtlarda alan zaten aynı; çift adında
   * (Zeynep & Ali) kullanıcı imzalayacak kişiyi yazıp bağı koparıyor.
   */
  const fullName = form.watch("full_name");
  const lastFullName = useRef(defaultValues.full_name);
  useEffect(() => {
    const current = form.getValues("contract_name") ?? "";
    if (current === "" || current === lastFullName.current) {
      form.setValue("contract_name", fullName);
    }
    lastFullName.current = fullName;
  }, [fullName, form]);

  return (
    <FormDialog
      trigger={trigger}
      triggerButton={triggerButton}
      title={customer ? "Müşteriyi düzenle" : "Yeni müşteri"}
      form={form}
      defaultValues={defaultValues}
      open={open}
      onOpenChange={onOpenChange}
      action={async (values) => {
        const result = await saveCustomer(values);
        // Yeni kayıtta kimliği yukarı bildir: çağıran formda seçili hâle
        // getirebilsin. Düzenlemede zaten seçili.
        if (result.ok && !customer) onCreated?.(result.data.id);
        if (result.ok) onSaved?.();
        return result;
      }}
      successMessage={customer ? "Müşteri güncellendi." : "Müşteri eklendi."}
    >
      <FormField form={form} name="full_name" label="Ad soyad">
        <Input
          id="full_name"
          placeholder="Zeynep & Ali Yılmaz"
          {...form.register("full_name")}
        />
      </FormField>

      <FormField
        form={form}
        name="contract_name"
        label="Sözleşmede geçecek ad"
        description="Çift adı girdiyseniz sözleşmeyi imzalayacak kişiyi yazın."
      >
        <Input
          id="contract_name"
          placeholder="Ali Yılmaz"
          {...form.register("contract_name")}
        />
      </FormField>

      <FormField form={form} name="phone" label="Telefon">
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          placeholder="0532 111 22 33"
          {...form.register("phone")}
        />
      </FormField>

      <div className="rounded-lg border">
        <button
          type="button"
          aria-expanded={showDetails}
          aria-controls="customer-details"
          onClick={() => setDetailsOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm"
        >
          <span>
            <span className="font-medium">Sözleşme ve iletişim bilgileri</span>
            <span className="block text-xs text-muted-foreground">
              E-posta, adres, T.C. Kimlik No — opsiyonel
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              showDetails && "rotate-180",
            )}
          />
        </button>

        {/* Kapalıyken de DOM'da: alanlar kayıtlı kalsın, değerler kaybolmasın. */}
        <div
          id="customer-details"
          hidden={!showDetails}
          className="space-y-4 border-t px-3 pt-3 pb-4"
        >
          <FormField form={form} name="email" label="E-posta">
            <Input
              id="email"
              type="email"
              placeholder="ornek@eposta.com"
              {...form.register("email")}
            />
          </FormField>

          <FormField form={form} name="address" label="Adres">
            <Textarea
              id="address"
              rows={2}
              placeholder="Sözleşmede kullanılır"
              {...form.register("address")}
            />
          </FormField>

          <FormField form={form} name="national_id" label="T.C. Kimlik No">
            <Input
              id="national_id"
              inputMode="numeric"
              maxLength={11}
              placeholder="11 hane"
              {...form.register("national_id")}
            />
            {/* KVKK: kimlik numarası zorunlu değil. Sözleşmede taraf kimliğinin
                yazılmasını isteyen işletmeler için opsiyonel bırakıldı. */}
            <p className="text-xs text-muted-foreground">
              Zorunlu değildir. Yalnızca sözleşmede kimlik bilgisi isteniyorsa
              doldurun; KVKK gereği gerekmedikçe bu alanı boş bırakmanız önerilir.
            </p>
          </FormField>
        </div>
      </div>

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
