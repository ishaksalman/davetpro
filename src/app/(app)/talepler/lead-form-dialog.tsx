"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserCheck } from "lucide-react";
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
import {
  FormDialog,
  FormField,
  type TriggerButton,
} from "@/components/shared/form-dialog";
import {
  LEAD_SOURCE_LABELS,
  ORGANIZATION_TYPE_LABELS,
} from "@/lib/constants";
import { formatPhone } from "@/lib/format";
import { leadSchema, type LeadInput } from "@/lib/schemas";
import type {
  Lead,
  Package,
  Profile,
  Venue,
  VenueAvailability,
} from "@/lib/database.types";
import { AvailabilityCheck } from "@/components/shared/availability-check";
import { findCustomerByPhone, saveLead } from "./actions";

export function LeadFormDialog({
  lead,
  customerName,
  customerPhone,
  venues,
  packages,
  members,
  trigger,
  triggerButton,
}: {
  lead?: Lead;
  customerName?: string;
  customerPhone?: string;
  venues: Venue[];
  packages: Package[];
  members: Pick<Profile, "id" | "full_name">[];
  trigger?: React.ReactElement;
  triggerButton?: TriggerButton;
}) {
  const isEdit = Boolean(lead);
  const activeVenues = venues.filter((v) => v.is_active || v.id === lead?.venue_id);
  const activePackages = packages.filter(
    (p) => p.is_active || p.id === lead?.package_id,
  );

  const defaultValues: LeadInput = {
    id: lead?.id,
    customer_id: lead?.customer_id ?? "none",
    full_name: customerName ?? "",
    phone: customerPhone ?? "",
    phone2: "",
    email: "",
    organization_type: lead?.organization_type ?? "dugun",
    source: lead?.source ?? "telefon",
    venue_id: lead?.venue_id ?? "none",
    package_id: lead?.package_id ?? "none",
    event_date: lead?.event_date ?? "",
    start_time: lead?.start_time?.slice(0, 5) ?? "",
    end_time: lead?.end_time?.slice(0, 5) ?? "",
    guest_count: lead?.guest_count ?? "",
    assigned_to: lead?.assigned_to ?? "none",
    next_follow_up_at: lead?.next_follow_up_at
      ? toLocalInput(lead.next_follow_up_at)
      : "",
    notes: lead?.notes ?? "",
  };

  const form = useForm<LeadInput>({
    resolver: zodResolver(leadSchema) as never,
    defaultValues,
  });

  const phone = form.watch("phone");
  const customerId = form.watch("customer_id");
  const eventDate = form.watch("event_date");
  const startTime = form.watch("start_time");
  const endTime = form.watch("end_time");
  const venueId = form.watch("venue_id");

  const [match, setMatch] = useState<{ id: string; full_name: string } | null>(null);
  // Dolu bir salon/saat için talep açılmaz: müşteriye alternatif önerilmeli.
  // Asıl engel veritabanı trigger'ında; bu, kullanıcıyı formu göndermeden önce
  // durdurup nedeni göstermek için.
  const [conflict, setConflict] = useState<VenueAvailability | null>(null);
  const handleConflict = useCallback(
    (next: VenueAvailability | null) => setConflict(next),
    [],
  );

  // Aynı telefonla kayıtlı müşteri varsa kullanıcıya söylenir; mükerrer kayıt
  // açmak yerine mevcut müşteriyi bağlaması önerilir.
  useEffect(() => {
    if (isEdit) return;
    const digits = (phone ?? "").replace(/\D/g, "");
    if (digits.length < 10) {
      setMatch(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const { customer } = await findCustomerByPhone(phone ?? "");
      if (!cancelled) setMatch(customer ? { id: customer.id, full_name: customer.full_name } : null);
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [phone, isEdit]);

  const linked = customerId && customerId !== "none";

  return (
    <FormDialog
      trigger={trigger}
      triggerButton={triggerButton}
      title={isEdit ? "Talebi düzenle" : "Yeni talep"}
      description={
        isEdit
          ? undefined
          : "Müşteri telefondayken hızlıca kaydedin; eksik alanları sonra tamamlayabilirsiniz."
      }
      form={form}
      defaultValues={defaultValues}
      action={saveLead}
      successMessage={isEdit ? "Talep güncellendi." : "Talep oluşturuldu."}
      submitBlockedReason={
        // Kart neyi söylüyorsa düğmenin yanında da o yazsın; iki farklı
        // gerekçe göstermek kullanıcıyı yanıltıyor.
        conflict
          ? conflict.gap_minutes !== null
            ? "İki organizasyon arasında en az 1 saat olmalı."
            : conflict.conflict_kind === "opsiyon"
              ? "Seçilen salon ve saat opsiyonlu. Farklı bir tarih veya salon seçin."
              : "Seçilen salon ve saatte kesin rezervasyon var. Farklı bir tarih veya salon seçin."
          : null
      }
      contentClassName="sm:max-w-2xl"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField form={form} name="full_name" label="Ad soyad">
          <Input
            id="full_name"
            autoFocus={!isEdit}
            placeholder="Reyhan & Ömer"
            disabled={Boolean(linked)}
            {...form.register("full_name")}
          />
        </FormField>

        <FormField form={form} name="phone" label="Telefon">
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            placeholder="0532 111 22 33"
            disabled={Boolean(linked)}
            {...form.register("phone")}
          />
        </FormField>
      </div>

      {match && !linked && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sky-500/10 px-3 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
            <UserCheck className="size-4 shrink-0" />
            Bu telefonla kayıtlı müşteri var: <strong>{match.full_name}</strong>
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              form.setValue("customer_id", match.id, { shouldDirty: true });
              form.setValue("full_name", match.full_name, { shouldDirty: true });
            }}
          >
            Mevcut müşteriyi kullan
          </Button>
        </div>
      )}

      {linked && !isEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">
            Mevcut müşteriye bağlandı: <strong>{form.watch("full_name")}</strong>
            {phone && ` · ${formatPhone(phone)}`}
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => form.setValue("customer_id", "none", { shouldDirty: true })}
          >
            Bağlantıyı kaldır
          </Button>
        </div>
      )}

      {!isEdit && !linked && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField form={form} name="phone2" label="İkinci telefon">
            <Input
              id="phone2"
              type="tel"
              placeholder="Opsiyonel"
              {...form.register("phone2")}
            />
          </FormField>
          <FormField form={form} name="email" label="E-posta">
            <Input
              id="email"
              type="email"
              placeholder="Opsiyonel"
              {...form.register("email")}
            />
          </FormField>
        </div>
      )}

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField form={form} name="venue_id" label="İlgilendiği salon">
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

        <FormField form={form} name="organization_type" label="Organizasyon türü">
          <Select
            value={form.watch("organization_type")}
            onValueChange={(v) =>
              form.setValue("organization_type", v as LeadInput["organization_type"], {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger id="organization_type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ORGANIZATION_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField form={form} name="event_date" label="Tahmini tarih">
          <DatePicker
            id="event_date"
            value={form.watch("event_date") ?? ""}
            onChange={(v) => form.setValue("event_date", v, { shouldDirty: true })}
          />
        </FormField>


        {/* İkisi tek hücrede: saat alanı beş karakterlik bir içerik için
            formun yarısını kaplıyordu. Yan yana durunca hem aralık tek
            bakışta okunuyor hem genişlik içerikle orantılı oluyor. */}
        <div className="grid grid-cols-2 gap-3">
          <FormField form={form} name="start_time" label="Başlangıç">
            <Input id="start_time" type="time" {...form.register("start_time")} />
          </FormField>

          <FormField form={form} name="end_time" label="Bitiş">
            <Input id="end_time" type="time" {...form.register("end_time")} />
          </FormField>
        </div>

        {/* Saat aralığı tamamlandığı anda sonuç hemen altında çıkıyor;
            eksik saatle spekülatif sorgu atılmıyor. */}
        <div className="sm:col-span-2">
          <AvailabilityCheck
            eventDate={eventDate || null}
            startTime={startTime || null}
            endTime={endTime || null}
            venueId={venueId && venueId !== "none" ? venueId : null}
            ignoreLeadId={lead?.id ?? null}
            onConflictChange={handleConflict}
          />
        </div>

        <FormField form={form} name="guest_count" label="Tahmini kişi sayısı">
          <Input
            id="guest_count"
            inputMode="numeric"
            placeholder="450"
            {...form.register("guest_count")}
          />
        </FormField>

        <FormField form={form} name="package_id" label="İlgilendiği paket">
          <Select
            value={form.watch("package_id") ?? "none"}
            onValueChange={(v) => form.setValue("package_id", v, { shouldDirty: true })}
          >
            <SelectTrigger id="package_id" className="w-full">
              <SelectValue placeholder="Belirsiz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Belirsiz</SelectItem>
              {activePackages.map((pkg) => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField form={form} name="assigned_to" label="Sorumlu">
          <Select
            value={form.watch("assigned_to") ?? "none"}
            onValueChange={(v) => form.setValue("assigned_to", v, { shouldDirty: true })}
          >
            <SelectTrigger id="assigned_to" className="w-full">
              <SelectValue placeholder="Atanmadı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Atanmadı</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField form={form} name="source" label="Kaynak">
          <Select
            value={form.watch("source")}
            onValueChange={(v) =>
              form.setValue("source", v as LeadInput["source"], { shouldDirty: true })
            }
          >
            <SelectTrigger id="source" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField
        form={form}
        name="next_follow_up_at"
        label="Sonraki takip"
        description="Müşteriyi ne zaman arayacağınızı yazın; Talepler ekranında hatırlatılır."
      >
        <Input
          id="next_follow_up_at"
          type="datetime-local"
          {...form.register("next_follow_up_at")}
        />
      </FormField>

      <FormField form={form} name="notes" label="Not">
        <Textarea
          id="notes"
          rows={2}
          placeholder="Müşterinin talepleri, bütçesi…"
          {...form.register("notes")}
        />
      </FormField>
    </FormDialog>
  );
}

/** ISO damgasını datetime-local girdisinin beklediği yerel biçime çevirir. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
