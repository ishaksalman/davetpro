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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  FormDialog,
  FormField,
  type TriggerButton,
} from "@/components/shared/form-dialog";
import { MoneyInput } from "@/components/shared/money-input";
import { ServicePicker } from "./service-picker";
import { packageSchema, type PackageInput } from "@/lib/schemas";
import type { Package, Venue } from "@/lib/database.types";
import { savePackage } from "./actions";

export function PackageFormDialog({
  pkg,
  venues,
  trigger,
  triggerButton,
}: {
  pkg?: Package;
  venues: Venue[];
  trigger?: React.ReactElement;
  triggerButton?: TriggerButton;
}) {
  const activeVenues = venues.filter((v) => v.is_active);
  // Tek salonlu işletmede seçim anlamsız; alan hiç gösterilmiyor.
  const scoped = activeVenues.length > 1;
  const defaultValues: PackageInput = {
    id: pkg?.id,
    name: pkg?.name ?? "",
    description: pkg?.description ?? "",
    venue_id: pkg?.venue_id ?? "none",
    base_price: pkg?.base_price ?? 0,
    pricing_type: pkg?.pricing_type ?? "sabit",
    included_services: pkg?.included_services ?? [],
    is_active: pkg?.is_active ?? true,
  };

  const form = useForm<PackageInput>({
    resolver: zodResolver(packageSchema) as never,
    defaultValues,
  });

  const services = form.watch("included_services") ?? [];
  const pricingType = form.watch("pricing_type");
  const perGuest = pricingType === "kisi_basi";

  return (
    <FormDialog
      trigger={trigger}
      triggerButton={triggerButton}
      title={pkg ? "Paketi düzenle" : "Yeni paket"}
      description="Paket fiyatı rezervasyon oluştururken başlangıç değeri olarak kullanılır."
      form={form}
      defaultValues={defaultValues}
      action={savePackage}
      successMessage={pkg ? "Paket güncellendi." : "Paket eklendi."}
    >
      <FormField form={form} name="name" label="Paket adı">
        <Input id="name" placeholder="Gold Paket" {...form.register("name")} />
      </FormField>

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
        <FormField
          form={form}
          name="base_price"
          label={perGuest ? "Kişi başı fiyat" : "Paket fiyatı"}
        >
          <MoneyInput
            id="base_price"
            value={form.watch("base_price")}
            onValueChange={(v) => form.setValue("base_price", v, { shouldDirty: true })}
          />
        </FormField>

        {/* Kuru kiralama gibi paketler yalnızca bir salona ait; menüler
            genelde tüm salonlarda geçerli. Tek salonlu işletmede seçim
            anlamsız olduğu için alan hiç çıkmıyor. */}
        {scoped && (
          <FormField
            form={form}
            name="venue_id"
            label="Geçerli olduğu salon"
            description="Yalnızca bu salonun rezervasyon ve tekliflerinde seçilebilir."
          >
            <Select
              value={form.watch("venue_id") ?? "none"}
              onValueChange={(v) => form.setValue("venue_id", v, { shouldDirty: true })}
            >
              <SelectTrigger id="venue_id" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tüm salonlar</SelectItem>
                {activeVenues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}
      </div>

      <FormField
        form={form}
        name="included_services"
        label="Dahil olan hizmetler"
      >
        <ServicePicker
          value={services}
          onChange={(update) =>
            form.setValue(
              "included_services",
              // getValues canlı form durumunu okur; art arda tıklamalarda
              // seçimler birbirinin üstüne yazmaz.
              update(form.getValues("included_services") ?? []),
              { shouldDirty: true },
            )
          }
        />
      </FormField>

      <FormField form={form} name="description" label="Açıklama">
        <Textarea id="description" rows={2} {...form.register("description")} />
      </FormField>

      <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <span className="text-sm">
          <span className="font-medium">Aktif</span>
          <span className="block text-muted-foreground">
            Pasif paketler rezervasyon formunda listelenmez.
          </span>
        </span>
        <Switch
          checked={form.watch("is_active")}
          onCheckedChange={(v) => form.setValue("is_active", v, { shouldDirty: true })}
        />
      </label>
    </FormDialog>
  );
}
