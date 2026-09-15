"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  FormDialog,
  FormField,
  type TriggerButton,
} from "@/components/shared/form-dialog";
import { VENUE_COLORS } from "@/lib/constants";
import { useVertical } from "@/components/layout/vertical-provider";
import { venueSchema, type VenueInput } from "@/lib/schemas";
import type { Venue } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { saveVenue } from "./actions";

export function VenueFormDialog({
  venue,
  trigger,
  triggerButton,
  suggestedColor,
}: {
  venue?: Venue;
  trigger?: React.ReactElement;
  triggerButton?: TriggerButton;
  suggestedColor?: string;
}) {
  const sozluk = useVertical();
  const kucuk = sozluk.resource.singular.toLocaleLowerCase("tr-TR");

  const defaultValues: VenueInput = {
    id: venue?.id,
    name: venue?.name ?? "",
    capacity: venue?.capacity ?? "",
    description: venue?.description ?? "",
    color: venue?.color ?? suggestedColor ?? VENUE_COLORS[0],
    is_active: venue?.is_active ?? true,
  };

  const form = useForm<VenueInput>({
    resolver: zodResolver(venueSchema) as never,
    defaultValues,
  });

  const color = form.watch("color");

  return (
    <FormDialog
      trigger={trigger}
      triggerButton={triggerButton}
      title={venue ? `${sozluk.resource.singular} bilgilerini düzenle` : sozluk.resourceNew}
      description={`${sozluk.resource.singular} adı takvimde ve rezervasyon listelerinde görünür.`}
      form={form}
      defaultValues={defaultValues}
      action={saveVenue}
      successMessage={venue ? `${sozluk.resource.singular} güncellendi.` : `${sozluk.resource.singular} eklendi.`}
    >
      <FormField form={form} name="name" label={`${sozluk.resource.singular} adı`}>
        <Input id="name" placeholder={sozluk.resourcePlaceholder} {...form.register("name")} />
      </FormField>

      {/* Kapasite salon işi: platoda kaç kişi alacağı değil, hangi çekimin
          yapılacağı önemli. Şemada opsiyonel, boş kalması sorun değil. */}
      {sozluk.usesGuestCount && (
        <FormField
          form={form}
          name="capacity"
          label="Kapasite"
          description="Kişi sayısı. Bilmiyorsanız boş bırakabilirsiniz."
        >
          <Input
            id="capacity"
            inputMode="numeric"
            placeholder="500"
            {...form.register("capacity")}
          />
        </FormField>
      )}

      <FormField
        form={form}
        name="color"
        label="Takvim rengi"
        description={`Takvimde bu ${kucuk} kaydının rezervasyonları bu renkle görünür.`}
      >
        <div className="flex flex-wrap gap-2">
          {VENUE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => form.setValue("color", c, { shouldDirty: true })}
              aria-label={`Renk ${c}`}
              aria-pressed={color === c}
              className={cn(
                "size-7 rounded-full ring-offset-2 ring-offset-background transition",
                color === c ? "ring-2 ring-foreground" : "hover:scale-110",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </FormField>

      <FormField form={form} name="description" label="Açıklama">
        <Textarea
          id="description"
          rows={3}
          placeholder={sozluk.resourceDescPlaceholder}
          {...form.register("description")}
        />
      </FormField>

      <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <span className="text-sm">
          <span className="font-medium">Aktif</span>
          <span className="block text-muted-foreground">
            Pasif kayıtlar yeni rezervasyon formunda listelenmez.
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
