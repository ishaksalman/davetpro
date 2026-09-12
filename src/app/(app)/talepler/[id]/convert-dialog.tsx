"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { formatDate, formatMoney, toNumber } from "@/lib/format";
import { convertLeadSchema, type ConvertLeadInput } from "@/lib/schemas";
import type { Package, Quote, Venue, VenueHold } from "@/lib/database.types";
import type { LeadRow } from "@/lib/leads";
import { AvailabilityCheck } from "@/components/shared/availability-check";
import { convertLead } from "../actions";

/**
 * Talebi rezervasyona dönüştürme ekranı.
 *
 * Bilgiler talepten ve kabul edilen tekliften önceden doldurulur; kullanıcı
 * son bir kez kontrol eder. Kaydetme işini convert_lead_to_reservation()
 * yapıyor: rezervasyon mevcut save_reservation() akışıyla açılıyor ve kapora
 * yalnızca bir kez tahsilata yazılıyor.
 */
export function ConvertDialog({
  lead,
  venues,
  packages,
  quotes,
  acceptedQuoteId,
  activeHold,
  trigger,
}: {
  lead: LeadRow;
  venues: Venue[];
  packages: Package[];
  quotes: Quote[];
  acceptedQuoteId: string | null;
  activeHold: VenueHold | null;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const activeVenues = venues.filter((v) => v.is_active || v.id === lead.venue_id);
  const activePackages = packages.filter((p) => p.is_active || p.id === lead.package_id);

  const source = quotes.find((q) => q.id === acceptedQuoteId) ?? null;

  const defaultValues: ConvertLeadInput = {
    lead_id: lead.id,
    quote_id: source?.id ?? "none",
    venue_id: source?.venue_id ?? lead.venue_id ?? activeHold?.venue_id ?? activeVenues[0]?.id ?? "",
    package_id: source?.package_id ?? lead.package_id ?? "none",
    event_date: activeHold?.event_date ?? lead.event_date ?? "",
    start_time:
      activeHold?.start_time?.slice(0, 5) ?? lead.start_time?.slice(0, 5) ?? "19:00",
    end_time: activeHold?.end_time?.slice(0, 5) ?? lead.end_time?.slice(0, 5) ?? "23:00",
    guest_count: source?.guest_count ?? lead.guest_count ?? "",
    // Teklifin indirimi zaten toplamına yansımış; rezervasyona tek tutar olarak
    // geçiriliyor ki iki yerde indirim sayılmasın.
    gross_amount: source?.total_amount ?? 0,
    discount_amount: 0,
    deposit_amount: 0,
    due_date: "",
    notes: lead.notes ?? "",
  };

  const form = useForm<ConvertLeadInput>({
    resolver: zodResolver(convertLeadSchema) as never,
    defaultValues,
  });

  const gross = toNumber(form.watch("gross_amount"));
  const discount = toNumber(form.watch("discount_amount"));
  const deposit = toNumber(form.watch("deposit_amount"));
  const net = Math.max(0, gross - discount);
  const remaining = Math.max(0, net - deposit);

  const eventDate = form.watch("event_date");
  const startTime = form.watch("start_time");
  const endTime = form.watch("end_time");
  const venueId = form.watch("venue_id");

  return (
    <FormDialog
      trigger={trigger}
      title="Rezervasyona dönüştür"
      description="Bilgiler talepten ve kabul edilen tekliften dolduruldu. Kontrol edip onaylayın."
      form={form}
      defaultValues={defaultValues}
      action={async (values) => {
        const result = await convertLead(values);
        if (result.ok) {
          toast.success("Rezervasyon oluşturuldu.");
          router.push(`/rezervasyonlar/${result.data.reservationId}`);
        }
        return result;
      }}
      successMessage="Talep rezervasyona dönüştürüldü."
      submitLabel="Rezervasyonu oluştur"
      contentClassName="sm:max-w-2xl"
    >
      {quotes.length > 0 && (
        <FormField
          form={form}
          name="quote_id"
          label="Kabul edilen teklif"
          description="Seçilen teklif kabul edildi, diğer bekleyen teklifler kapatılır."
        >
          <Select
            value={form.watch("quote_id") ?? "none"}
            onValueChange={(v) => {
              form.setValue("quote_id", v, { shouldDirty: true });
              const picked = quotes.find((q) => q.id === v);
              if (picked) {
                form.setValue("gross_amount", picked.total_amount, { shouldDirty: true });
                if (picked.guest_count) {
                  form.setValue("guest_count", picked.guest_count, { shouldDirty: true });
                }
              }
            }}
          >
            <SelectTrigger id="quote_id" className="w-full">
              <SelectValue placeholder="Teklifsiz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Teklifsiz</SelectItem>
              {quotes.map((quote) => (
                <SelectItem key={quote.id} value={quote.id}>
                  Teklif #{quote.version} · {formatMoney(quote.total_amount)} ·{" "}
                  {formatDate(quote.created_at)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

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
              {activePackages.map((pkg) => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField form={form} name="event_date" label="Tarih">
          <DatePicker
            id="event_date"
            value={form.watch("event_date")}
            onChange={(v) => form.setValue("event_date", v ?? "", { shouldDirty: true })}
          />
        </FormField>

        <FormField form={form} name="guest_count" label="Kişi sayısı">
          <Input
            id="guest_count"
            inputMode="numeric"
            {...form.register("guest_count")}
          />
        </FormField>

        <FormField form={form} name="start_time" label="Başlangıç">
          <Input id="start_time" type="time" {...form.register("start_time")} />
        </FormField>

        <FormField form={form} name="end_time" label="Bitiş">
          <Input id="end_time" type="time" {...form.register("end_time")} />
        </FormField>
      </div>

      <AvailabilityCheck
        eventDate={eventDate || null}
        startTime={startTime || null}
        endTime={endTime || null}
        venueId={venueId || null}
        ignoreLeadId={lead.id}
      />

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField form={form} name="gross_amount" label="Toplam satış fiyatı">
          <MoneyInput
            id="gross_amount"
            value={form.watch("gross_amount")}
            onValueChange={(v) => form.setValue("gross_amount", v, { shouldDirty: true })}
          />
        </FormField>

        <FormField form={form} name="discount_amount" label="Ek indirim">
          <MoneyInput
            id="discount_amount"
            value={form.watch("discount_amount")}
            onValueChange={(v) =>
              form.setValue("discount_amount", v, { shouldDirty: true })
            }
          />
        </FormField>

        <FormField
          form={form}
          name="deposit_amount"
          label="Kapora"
          description="Girilirse tahsilat olarak bir kez kaydedilir."
        >
          <MoneyInput
            id="deposit_amount"
            value={form.watch("deposit_amount")}
            onValueChange={(v) =>
              form.setValue("deposit_amount", v, { shouldDirty: true })
            }
          />
        </FormField>

        <FormField form={form} name="due_date" label="Kalan ödeme tarihi">
          <DatePicker
            id="due_date"
            value={form.watch("due_date") ?? ""}
            onChange={(v) => form.setValue("due_date", v, { shouldDirty: true })}
          />
        </FormField>
      </div>

      <dl className="space-y-2 rounded-lg bg-muted/60 px-4 py-3 text-sm">
        <Row label="Toplam" value={formatMoney(net)} strong />
        <Row label="Kapora" value={formatMoney(deposit)} />
        <Row label="Kalan" value={formatMoney(remaining)} strong />
      </dl>

      <FormField form={form} name="notes" label="Rezervasyon notu">
        <Textarea id="notes" rows={2} {...form.register("notes")} />
      </FormField>
    </FormDialog>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={strong ? "font-medium" : "text-muted-foreground"}>{label}</dt>
      <dd className={strong ? "tabular font-semibold" : "tabular"}>{value}</dd>
    </div>
  );
}
