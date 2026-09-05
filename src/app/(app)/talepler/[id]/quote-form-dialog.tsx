"use client";

import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/shared/date-picker";
import { FormDialog, FormField } from "@/components/shared/form-dialog";
import { MoneyInput } from "@/components/shared/money-input";
import { formatMoney, toNumber } from "@/lib/format";
import { quoteSchema, type QuoteInput } from "@/lib/schemas";
import type { Package, Venue } from "@/lib/database.types";
import { createQuote } from "../actions";

/** Sık kullanılan ek hizmetler; tek tıkla eklenip tutarı düzenlenebilir. */
const SUGGESTED_EXTRAS = [
  { name: "Fotoğraf & Video", amount: 10000 },
  { name: "Premium Dekorasyon", amount: 15000 },
  { name: "Ekstra Menü", amount: 20000 },
  { name: "Müzik / DJ", amount: 12000 },
];

export function QuoteFormDialog({
  leadId,
  venues,
  packages,
  defaults,
  isRevision,
}: {
  leadId: string;
  venues: Venue[];
  packages: Package[];
  defaults: {
    venue_id: string | null;
    package_id: string | null;
    guest_count: number | null;
  };
  isRevision: boolean;
}) {
  const activeVenues = venues.filter((v) => v.is_active);
  const activePackages = packages.filter((p) => p.is_active);

  /** Paketin listedeki fiyatı; kişi başı paketlerde kişi sayısıyla çarpılır. */
  function packagePrice(packageId: string | null, guests: number): number {
    const selected = activePackages.find((p) => p.id === packageId);
    if (!selected) return 0;
    return selected.pricing_type === "kisi_basi"
      ? Math.round(selected.base_price * guests * 100) / 100
      : selected.base_price;
  }

  const defaultValues: QuoteInput = {
    lead_id: leadId,
    venue_id: defaults.venue_id ?? "none",
    package_id: defaults.package_id ?? "none",
    guest_count: defaults.guest_count ?? "",
    // Paket fiyatı doğrudan varsayılana giriyor. Yalnızca efektle doldurmak
    // yetmiyordu: FormDialog pencere her açıldığında formu defaultValues'a
    // sıfırlıyor ve efekt paket/kişi sayısı değişmediği için yeniden
    // çalışmıyordu — tutar 0'da kalıyordu.
    package_amount: packagePrice(defaults.package_id, defaults.guest_count ?? 0),
    discount_amount: 0,
    valid_until: "",
    notes: "",
    items: [],
  };

  const form = useForm<QuoteInput>({
    resolver: zodResolver(quoteSchema) as never,
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const packageId = form.watch("package_id");
  const guestCount = toNumber(form.watch("guest_count"));
  const packageAmount = toNumber(form.watch("package_amount"));
  const discount = toNumber(form.watch("discount_amount"));
  const items = form.watch("items") ?? [];
  const extras = items.reduce((sum, item) => sum + toNumber(item.amount), 0);
  const total = Math.max(0, packageAmount + extras - discount);

  // Salona bağlı paketler yalnızca o salonda seçilebilir; rezervasyon
  // formundaki kuralın aynısı.
  const selectedVenue = form.watch("venue_id");
  const selectablePackages = activePackages.filter(
    (p) => !p.venue_id || p.venue_id === selectedVenue,
  );

  // Salon değişince geçersiz kalan paket temizlenir.
  useEffect(() => {
    if (!packageId || packageId === "none") return;
    if (selectablePackages.some((p) => p.id === packageId)) return;
    form.setValue("package_id", "none", { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVenue]);

  // Kullanıcı paketi veya kişi sayısını değiştirdiğinde fiyatı yeniden öner.
  // Açılıştaki değer defaultValues'tan geliyor.
  useEffect(() => {
    if (!packageId || packageId === "none") return;

    form.setValue("package_amount", packagePrice(packageId, guestCount), {
      shouldDirty: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId, guestCount]);

  return (
    <FormDialog
      triggerButton={{
        label: isRevision ? "Teklifi revize et" : "Teklif oluştur",
        icon: "plus",
        variant: "outline",
        size: "sm",
      }}
      title={isRevision ? "Teklifi revize et" : "Teklif oluştur"}
      description={
        isRevision
          ? "Yeni bir sürüm oluşturulur; önceki teklif kayıtlarda kalır."
          : undefined
      }
      form={form}
      defaultValues={defaultValues}
      action={createQuote}
      successMessage="Teklif oluşturuldu."
      submitLabel="Teklifi oluştur"
      contentClassName="sm:max-w-2xl"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField form={form} name="venue_id" label="Salon">
          <Select
            value={form.watch("venue_id") ?? "none"}
            onValueChange={(v) => form.setValue("venue_id", v, { shouldDirty: true })}
          >
            <SelectTrigger id="venue_id" className="w-full">
              <SelectValue placeholder="Belirsiz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Belirsiz</SelectItem>
              {activeVenues.map((venue) => (
                <SelectItem key={venue.id} value={venue.id}>
                  {venue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField form={form} name="package_id" label="Paket">
          <Select
            value={form.watch("package_id") ?? "none"}
            onValueChange={(v) => form.setValue("package_id", v, { shouldDirty: true })}
          >
            <SelectTrigger id="package_id" className="w-full">
              <SelectValue placeholder="Paketsiz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Paketsiz</SelectItem>
              {selectablePackages.map((pkg) => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField form={form} name="guest_count" label="Kişi sayısı">
          <Input
            id="guest_count"
            inputMode="numeric"
            placeholder="450"
            {...form.register("guest_count")}
          />
        </FormField>
      </div>

      <FormField form={form} name="package_amount" label="Teklif tutarı">
        <MoneyInput
          id="package_amount"
          value={form.watch("package_amount")}
          onValueChange={(v) => form.setValue("package_amount", v, { shouldDirty: true })}
        />
      </FormField>

      <Separator />

      {/* Ek hizmetler */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Ek hizmetler</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => append({ name: "", amount: 0 })}
          >
            <Plus />
            Satır ekle
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_EXTRAS.filter(
            (extra) => !items.some((item) => item.name === extra.name),
          ).map((extra) => (
            <button
              key={extra.name}
              type="button"
              onClick={() => append(extra)}
              className="rounded-md border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
            >
              + {extra.name}
            </button>
          ))}
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="flex items-end gap-2">
            <FormField
              form={form}
              name={`items.${index}.name`}
              label={index === 0 ? "Hizmet" : ""}
              className="flex-1"
            >
              <Input
                placeholder="Fotoğraf & Video"
                {...form.register(`items.${index}.name`)}
              />
            </FormField>
            <FormField
              form={form}
              name={`items.${index}.amount`}
              label={index === 0 ? "Tutar" : ""}
              className="w-40"
            >
              <MoneyInput
                value={form.watch(`items.${index}.amount`)}
                onValueChange={(v) =>
                  form.setValue(`items.${index}.amount`, v, { shouldDirty: true })
                }
              />
            </FormField>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              aria-label="Satırı sil"
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField form={form} name="discount_amount" label="İndirim">
          <MoneyInput
            id="discount_amount"
            value={form.watch("discount_amount")}
            onValueChange={(v) => form.setValue("discount_amount", v, { shouldDirty: true })}
          />
        </FormField>

        <FormField
          form={form}
          name="valid_until"
          label="Geçerlilik tarihi"
          description="Bu tarih geçtiğinde teklif otomatik olarak süresi doldu sayılır."
        >
          <DatePicker
            id="valid_until"
            value={form.watch("valid_until") ?? ""}
            onChange={(v) => form.setValue("valid_until", v, { shouldDirty: true })}
          />
        </FormField>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3">
        <span className="text-sm font-medium">Toplam teklif</span>
        <span className="tabular text-lg font-semibold">{formatMoney(total)}</span>
      </div>

      <FormField form={form} name="notes" label="Teklif notu">
        <Textarea
          id="notes"
          rows={2}
          placeholder="Teklife dahil olmayan hizmetler, özel şartlar…"
          {...form.register("notes")}
        />
      </FormField>
    </FormDialog>
  );
}
