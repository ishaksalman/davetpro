"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/shared/combobox";
import { CustomerFormDialog } from "../musteriler/customer-form-dialog";
import { DatePicker } from "@/components/shared/date-picker";
import {
  FormDialog,
  FormField,
  type TriggerButton,
} from "@/components/shared/form-dialog";
import { MoneyInput } from "@/components/shared/money-input";
import {
  enumOptions,
  ORGANIZATION_TYPE_LABELS,
} from "@/lib/constants";
import { formatMoney, formatNumber, formatPhone, toNumber } from "@/lib/format";
import { reservationSchema, type ReservationInput } from "@/lib/schemas";
import type {
  Customer,
  Package,
  Reservation,
  ReservationPricing,
  Venue,
} from "@/lib/database.types";
import { saveReservation } from "./actions";

export type EditableReservation = Reservation & {
  pricing?: ReservationPricing | null;
};

type FormValues = ReservationInput;

export function ReservationFormDialog({
  reservation,
  customers,
  venues,
  packages,
  showFinance,
  defaults,
  trigger,
  triggerButton,
  open,
  onOpenChange,
}: {
  reservation?: EditableReservation;
  customers: Customer[];
  venues: Venue[];
  packages: Package[];
  showFinance: boolean;
  /** Takvimden hızlı oluşturma için ön dolgu. */
  defaults?: { event_date?: string; venue_id?: string; start_time?: string; end_time?: string };
  trigger?: React.ReactElement;
  triggerButton?: TriggerButton;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = Boolean(reservation);

  // Müşteri ekleme penceresi tek yerde ve denetimli: hem açılır listedeki
  // bağlantı hem yandaki simge düğmesi bunu açıyor. Popover'ın içine ayrı bir
  // Dialog gömmek yerine böyle daha sağlam.
  const [customerOpen, setCustomerOpen] = useState(false);

  const activeVenues = venues.filter((v) => v.is_active || v.id === reservation?.venue_id);
  const activePackages = packages.filter(
    (p) => p.is_active || p.id === reservation?.package_id,
  );

  const defaultValues: FormValues = {
    id: reservation?.id,
    customer_id: reservation?.customer_id ?? "",
    venue_id: reservation?.venue_id ?? defaults?.venue_id ?? activeVenues[0]?.id ?? "",
    package_id: reservation?.package_id ?? "none",
    organization_type: reservation?.organization_type ?? "dugun",
    // Durum formda seçilmiyor: satış hattı Talepler'de, rezervasyon
    // kesinleşmiş işi temsil ediyor. Sonraki geçişler (tamamlandı / iptal)
    // detay sayfasındaki durum menüsünden yapılıyor.
    status: reservation?.status ?? "kesinlesti",
    event_date: reservation?.event_date ?? defaults?.event_date ?? "",
    start_time: reservation?.start_time?.slice(0, 5) ?? defaults?.start_time ?? "19:00",
    end_time: reservation?.end_time?.slice(0, 5) ?? defaults?.end_time ?? "23:00",
    guest_count: reservation?.guest_count ?? "",
    notes: reservation?.notes ?? "",
    pricing_type: reservation?.pricing?.unit_price ? "kisi_basi" : "sabit",
    unit_price: reservation?.pricing?.unit_price ?? 0,
    gross_amount: reservation?.pricing?.gross_amount ?? 0,
    discount_amount: reservation?.pricing?.discount_amount ?? 0,
    due_date: reservation?.pricing?.due_date ?? undefined,
    deposit_amount: 0,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(reservationSchema) as never,
    defaultValues,
  });

  const packageId = form.watch("package_id");
  const pricingType = form.watch("pricing_type");
  const perGuest = pricingType === "kisi_basi";
  const unitPrice = toNumber(form.watch("unit_price"));
  const guestCount = toNumber(form.watch("guest_count"));
  const gross = toNumber(form.watch("gross_amount"));
  const discount = toNumber(form.watch("discount_amount"));
  const net = Math.max(0, gross - discount);

  // Salona bağlı paketler yalnızca o salonda seçilebilir; salonu olmayanlar
  // her zaman listede. Kuru kiralama paketinin yanlış salona uygulanmasını
  // engelliyor. Düzenlemede mevcut paket, kuralı bozsa bile listede kalır ki
  // kayıt açılır açılmaz sessizce değişmesin.
  const selectedVenue = form.watch("venue_id");
  const selectablePackages = activePackages.filter(
    (p) =>
      !p.venue_id ||
      p.venue_id === selectedVenue ||
      p.id === reservation?.package_id,
  );

  // Salon değişince seçili paket artık geçerli değilse temizlenir; aksi halde
  // form yanlış salona ait bir paketle kaydedilebilirdi.
  useEffect(() => {
    if (!packageId || packageId === "none") return;
    if (selectablePackages.some((p) => p.id === packageId)) return;
    form.setValue("package_id", "none", { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVenue]);

  // Kişi başı modda toplam, birim fiyat × kişi sayısından canlı türetilir.
  // Kaydedilen yine tek bir tutardır (gross_amount) — muhasebe tarafı sade kalır.
  useEffect(() => {
    if (!perGuest) return;
    const total = Math.round(unitPrice * guestCount * 100) / 100;
    if (total !== gross) {
      form.setValue("gross_amount", total, { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perGuest, unitPrice, guestCount]);

  // Paket seçildiğinde fiyat ve kişi sayısını öner; kullanıcı sonra
  // değiştirebilir. Düzenlemede mevcut fiyatın üzerine yazılmaz.
  useEffect(() => {
    if (isEdit || !packageId || packageId === "none") return;
    const selected = selectablePackages.find((p) => p.id === packageId);
    if (!selected) return;


    form.setValue("pricing_type", selected.pricing_type, { shouldDirty: true });
    if (selected.pricing_type === "kisi_basi") {
      // Toplam, yukarıdaki efektte kişi sayısıyla çarpılarak hesaplanır.
      form.setValue("unit_price", selected.base_price, { shouldDirty: true });
    } else {
      form.setValue("unit_price", 0, { shouldDirty: true });
      form.setValue("gross_amount", selected.base_price, { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId]);

  return (
    <FormDialog
      trigger={trigger}
      triggerButton={triggerButton}
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Rezervasyonu düzenle" : "Yeni rezervasyon"}
      form={form}
      defaultValues={defaultValues}
      action={saveReservation}
      successMessage={isEdit ? "Rezervasyon güncellendi." : "Rezervasyon oluşturuldu."}
      contentClassName="sm:max-w-2xl"
    >
      <FormField form={form} name="customer_id" label="Müşteri">
        <div className="flex items-center gap-2">
          <Combobox
            id="customer_id"
            className="min-w-0 flex-1"
            options={customers.map((c) => ({
              value: c.id,
              label: c.full_name,
              hint: formatPhone(c.phone),
            }))}
            value={form.watch("customer_id")}
            onChange={(v) => form.setValue("customer_id", v, { shouldDirty: true })}
            placeholder="Müşteri seçin"
            searchPlaceholder="Ad veya telefon ara…"
            emptyMessage="Bu aramaya uyan müşteri yok."
            footer={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setCustomerOpen(true)}
              >
                <UserPlus />
                Yeni müşteri ekle
              </Button>
            }
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Yeni müşteri ekle"
            title="Yeni müşteri ekle"
            onClick={() => setCustomerOpen(true)}
          >
            <UserPlus />
          </Button>
        </div>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField form={form} name="venue_id" label="Salon">
          <Select
            value={form.watch("venue_id")}
            onValueChange={(v) => form.setValue("venue_id", v, { shouldDirty: true })}
          >
            <SelectTrigger id="venue_id" className="w-full">
              <SelectValue placeholder="Salon seçin" />
            </SelectTrigger>
            <SelectContent>
              {activeVenues.map((venue) => (
                <SelectItem key={venue.id} value={venue.id}>
                  <span
                    aria-hidden
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: venue.color }}
                  />
                  {venue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField form={form} name="organization_type" label="Organizasyon türü">
          <Select
            value={form.watch("organization_type")}
            onValueChange={(v) =>
              form.setValue("organization_type", v as never, { shouldDirty: true })
            }
          >
            <SelectTrigger id="organization_type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(ORGANIZATION_TYPE_LABELS).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField form={form} name="event_date" label="Tarih">
          <DatePicker
            id="event_date"
            value={form.watch("event_date")}
            onChange={(v) => form.setValue("event_date", v ?? "", { shouldDirty: true })}
          />
        </FormField>

        {/* Saatler tek hücrede: beş karakterlik içerik formun yarısını
            kaplamasın, aralık da tek bakışta okunsun. */}
        <div className="grid grid-cols-2 gap-3">
          <FormField form={form} name="start_time" label="Başlangıç">
            <Input id="start_time" type="time" {...form.register("start_time")} />
          </FormField>

          <FormField form={form} name="end_time" label="Bitiş">
            <Input id="end_time" type="time" {...form.register("end_time")} />
          </FormField>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField form={form} name="package_id" label="Paket">
          <Select
            value={form.watch("package_id") ?? "none"}
            onValueChange={(v) => form.setValue("package_id", v, { shouldDirty: true })}
          >
            <SelectTrigger id="package_id" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Paketsiz</SelectItem>
              {selectablePackages.map((pkg) => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  {pkg.name} · {formatMoney(pkg.base_price)}
                  {pkg.pricing_type === "kisi_basi" && " / kişi"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField form={form} name="guest_count" label="Tahmini kişi">
          <Input
            id="guest_count"
            inputMode="numeric"
            placeholder="400"
            {...form.register("guest_count")}
          />
        </FormField>
      </div>

      {showFinance && (
        <>
          <Separator className="my-2" />

          <Tabs
            value={pricingType}
            onValueChange={(v) =>
              form.setValue("pricing_type", v as "sabit" | "kisi_basi", {
                shouldDirty: true,
              })
            }
          >
            <TabsList className="w-full">
              <TabsTrigger value="sabit" className="flex-1">
                Sabit fiyat
              </TabsTrigger>
              <TabsTrigger value="kisi_basi" className="flex-1">
                Kişi başı fiyat
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-4 sm:grid-cols-2">
            {perGuest ? (
              <FormField
                form={form}
                name="unit_price"
                label="Kişi başı fiyat"
                description={`${formatNumber(guestCount)} kişi ile çarpılır.`}
              >
                <MoneyInput
                  id="unit_price"
                  value={form.watch("unit_price")}
                  onValueChange={(v) =>
                    form.setValue("unit_price", v, { shouldDirty: true })
                  }
                />
              </FormField>
            ) : (
              <FormField form={form} name="gross_amount" label="Anlaşılan toplam fiyat">
                <MoneyInput
                  id="gross_amount"
                  value={form.watch("gross_amount")}
                  onValueChange={(v) =>
                    form.setValue("gross_amount", v, { shouldDirty: true })
                  }
                />
              </FormField>
            )}

            <FormField form={form} name="discount_amount" label="İndirim">
              <MoneyInput
                id="discount_amount"
                value={form.watch("discount_amount")}
                onValueChange={(v) =>
                  form.setValue("discount_amount", v, { shouldDirty: true })
                }
              />
            </FormField>
          </div>

          <div className="space-y-1.5 rounded-lg bg-muted px-3.5 py-3 text-sm">
            {perGuest && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Toplam fiyat</span>
                <span className="tabular">
                  {guestCount > 0
                    ? `${formatMoney(unitPrice)} × ${formatNumber(guestCount)} kişi = ${formatMoney(gross)}`
                    : "Kişi sayısı girin"}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Net satış tutarı</span>
              <span className="text-base font-semibold tabular">{formatMoney(net)}</span>
            </div>
          </div>

          {!isEdit && (
            <FormField
              form={form}
              name="deposit_amount"
              label="Alınan kapora"
              description="Şimdi tahsil ettiyseniz girin; ilk ödeme kaydı otomatik oluşturulur."
            >
              <MoneyInput
                id="deposit_amount"
                value={form.watch("deposit_amount")}
                onValueChange={(v) =>
                  form.setValue("deposit_amount", v, { shouldDirty: true })
                }
              />
            </FormField>
          )}

          <FormField
            form={form}
            name="due_date"
            label="Kalan ödeme tarihi"
            description="Yaklaşan ödemeler listesinde bu tarihe göre hatırlatılır."
          >
            <DatePicker
              id="due_date"
              value={form.watch("due_date")}
              onChange={(v) => form.setValue("due_date", v ?? undefined, { shouldDirty: true })}
              placeholder="Belirtilmedi"
              clearable
            />
          </FormField>
        </>
      )}

      <FormField form={form} name="notes" label="Notlar">
        <Textarea
          id="notes"
          rows={3}
          placeholder="Menü tercihi, dekorasyon isteği, özel talepler…"
          {...form.register("notes")}
        />
      </FormField>
      {/* Rezervasyon penceresinin içinde ama form alanlarının dışında:
          kaydedilen müşteri hemen seçili hâle geliyor. Liste sunucudan
          tazelenip geldiğinde adı da görünüyor. */}
      <CustomerFormDialog
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        onCreated={(id) =>
          form.setValue("customer_id", id, { shouldDirty: true })
        }
      />
    </FormDialog>
  );
}
