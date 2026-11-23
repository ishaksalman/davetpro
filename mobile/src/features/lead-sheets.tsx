import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Controller, useFieldArray } from "react-hook-form";
import { useForm } from "~/lib/use-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import { LEAD_ACTIVITY_LABELS, LEAD_LOST_REASON_LABELS, enumOptions } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import {
  convertLeadSchema, holdSchema, leadActivitySchema, leadLostSchema, quoteSchema,
  type ConvertLeadInput, type HoldInput, type LeadActivityInput, type LeadLostInput, type QuoteInput,
} from "@/lib/schemas";
import type { Package, Quote, Venue, VenueHold } from "@/lib/database.types";
import { todayISO } from "@/lib/time";
import { useSessionContext } from "~/lib/auth/session";
import { useConvertLead, useLeadActions, type LeadDetail, type LeadRow } from "~/lib/data/leads";
import { istanbulISO, packagePrice } from "~/lib/domain/leads";
import { pricingTotals } from "~/lib/domain/reservation-payload";
import { submitBlockedReason } from "~/lib/domain/availability";
import { useSubmitGuard } from "~/lib/hooks";
import { Banner, useToast } from "~/ui/Feedback";
import { Button, IconButton } from "~/ui/Button";
import { MoneyField, TextField, TimeField } from "~/ui/Inputs";
import { DateField, SelectField } from "~/ui/Pickers";
import { BottomSheet } from "~/ui/Sheet";
import { Text } from "~/ui/Text";
import { radius } from "~/design/tokens";
import { useTheme } from "~/design/theme";
import { AvailabilityNotice, useAvailabilityView } from "./availability-notice";

type SheetProps = { visible: boolean; onClose: () => void };

/** Ortak: sonuç → toast + kapat; hata → sayfa içi Banner (girdiler korunur). */
function useSubmit(onDone: () => void, success: string) {
  const toast = useToast();
  const guard = useSubmitGuard();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    guard.run(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) return setError(r.error ?? "İşlem yapılamadı.");
      toast({ tone: "success", message: success });
      onDone();
    });
  return { run, pending: guard.pending, error };
}

// --- Kaybedildi --------------------------------------------------------------

export function LostSheet({ leadId, visible, onClose }: SheetProps & { leadId: string }) {
  return <BottomSheet visible={visible} title="Talep kaybedildi" onClose={onClose}><LostForm leadId={leadId} onDone={onClose} /></BottomSheet>;
}
function LostForm({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const a = useLeadActions(leadId);
  const s = useSubmit(onDone, "Talep kaybedildi olarak işaretlendi");
  const { control, handleSubmit, formState: { errors } } = useForm<LeadLostInput>({
    resolver: zodResolver(leadLostSchema) as never,
    defaultValues: { lead_id: leadId, lost_reason: "fiyat", lost_note: "" },
  });
  return (
    <View style={{ gap: 16 }}>
      {s.error ? <Banner reveal tone="danger" title="Kaydedilemedi" body={s.error} /> : null}
      <Controller control={control} name="lost_reason" render={({ field }) => (
        <SelectField label="Neden" value={field.value} options={enumOptions(LEAD_LOST_REASON_LABELS)} onChange={field.onChange} />
      )} />
      <Controller control={control} name="lost_note" render={({ field }) => (
        <TextField label="Not (Diğer seçildiğinde zorunlu)" multiline value={field.value ?? ""} onChangeText={field.onChange} error={errors.lost_note?.message} />
      )} />
      <Button label="Kaybedildi olarak işaretle" variant="destructive" loading={s.pending} onPress={handleSubmit((v) => s.run(() => a.lost.mutateAsync(v)))} />
    </View>
  );
}

// --- Görüşme -----------------------------------------------------------------

export function ActivitySheet({ leadId, visible, onClose }: SheetProps & { leadId: string }) {
  return <BottomSheet visible={visible} title="Görüşme ekle" onClose={onClose}><ActivityForm leadId={leadId} onDone={onClose} /></BottomSheet>;
}
function ActivityForm({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const { vertical: v } = useSessionContext();
  const a = useLeadActions(leadId);
  const s = useSubmit(onDone, "Görüşme kaydedildi");
  const { control, handleSubmit, formState: { errors } } = useForm<LeadActivityInput>({
    resolver: zodResolver(leadActivitySchema) as never,
    defaultValues: { lead_id: leadId, type: "telefon", note: "", occurred_at: "" },
  });
  const types = enumOptions(LEAD_ACTIVITY_LABELS).filter((o) => o.value !== "sistem");
  return (
    <View style={{ gap: 16 }}>
      {s.error ? <Banner reveal tone="danger" title="Kaydedilemedi" body={s.error} /> : null}
      <Controller control={control} name="type" render={({ field }) => <SelectField label="Tür" value={field.value} options={types as never} onChange={field.onChange} />} />
      <Controller control={control} name="note" render={({ field }) => (
        <TextField label="Not" multiline placeholder={v.activityPlaceholder} value={field.value} onChangeText={field.onChange} error={errors.note?.message} />
      )} />
      <Button label="Kaydet" loading={s.pending} onPress={handleSubmit((x) => s.run(() => a.activity.mutateAsync(x)))} />
    </View>
  );
}

// --- Takip tarihi ------------------------------------------------------------

export function FollowUpSheet({ leadId, current, visible, onClose }: SheetProps & { leadId: string; current: string | null }) {
  return <BottomSheet visible={visible} title="Takip tarihi" onClose={onClose}><FollowUpForm leadId={leadId} current={current} onDone={onClose} /></BottomSheet>;
}
function FollowUpForm({ leadId, current, onDone }: { leadId: string; current: string | null; onDone: () => void }) {
  const a = useLeadActions(leadId);
  const s = useSubmit(onDone, "Takip tarihi kaydedildi");
  const [date, setDate] = useState<string | null>(current ? current.slice(0, 10) : null);
  const [time, setTime] = useState("10:00");
  return (
    <View style={{ gap: 16 }}>
      {s.error ? <Banner reveal tone="danger" title="Kaydedilemedi" body={s.error} /> : null}
      <DateField label="Tarih" value={date} onChange={setDate} clearable placeholder="Belirtilmedi" minDate={todayISO()} />
      <TimeField label="Saat" value={time} onChange={setTime} />
      <Button label="Kaydet" loading={s.pending} onPress={() => s.run(() => a.followUp.mutateAsync(date ? istanbulISO(date, time) : null))} />
    </View>
  );
}

// --- Opsiyon -----------------------------------------------------------------

export function HoldSheet({ lead, venues, visible, onClose }: SheetProps & { lead: LeadRow; venues: Venue[] }) {
  return <BottomSheet visible={visible} title="Tarihi opsiyona al" onClose={onClose}><HoldForm lead={lead} venues={venues} onDone={onClose} /></BottomSheet>;
}
function HoldForm({ lead, venues, onDone }: { lead: LeadRow; venues: Venue[]; onDone: () => void }) {
  const { vertical: v } = useSessionContext();
  const a = useLeadActions(lead.id);
  const s = useSubmit(onDone, "Tarih opsiyona alındı");
  const active = venues.filter((x) => x.is_active && !x.allows_overlap);
  const [expDate, setExpDate] = useState(format(addDays(new Date(), 3), "yyyy-MM-dd"));
  const [expTime, setExpTime] = useState("18:00");
  const { control, handleSubmit, watch, formState: { errors } } = useForm<HoldInput>({
    resolver: zodResolver(holdSchema) as never,
    defaultValues: {
      lead_id: lead.id, venue_id: lead.venue_id ?? (active.length === 1 ? active[0].id : ""), event_date: lead.event_date ?? "",
      start_time: lead.start_time?.slice(0, 5) ?? v.defaultTimes.start, end_time: lead.end_time?.slice(0, 5) ?? v.defaultTimes.end,
      expires_at: "", note: "",
    },
  });
  const venueId = watch("venue_id"); const date = watch("event_date"); const st = watch("start_time"); const et = watch("end_time");
  const avail = useAvailabilityView({ venue: active.find((x) => x.id === venueId) ?? null, eventDate: date, startTime: st, endTime: et });
  const blocked = submitBlockedReason(avail.view, v);
  return (
    <View style={{ gap: 16 }}>
      <Text variant="subhead" color="textSecondary">Opsiyon, süre dolana kadar {v.resource.singular.toLocaleLowerCase("tr-TR")} ve saati başkasına kapatır.</Text>
      {s.error ? <Banner reveal tone="danger" title="Kaydedilemedi" body={s.error} /> : null}
      <Controller control={control} name="venue_id" render={({ field }) => (
        <SelectField label={v.resourceField} value={field.value || null} onChange={field.onChange} error={errors.venue_id?.message} options={active.map((x) => ({ value: x.id, label: x.name, color: x.color }))} />
      )} />
      <Controller control={control} name="event_date" render={({ field }) => <DateField label="Tarih" value={field.value || null} onChange={(d) => field.onChange(d ?? "")} error={errors.event_date?.message} />} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Controller control={control} name="start_time" render={({ field }) => <TimeField label="Başlangıç" value={field.value} onChange={field.onChange} error={errors.start_time?.message} />} /></View>
        <View style={{ flex: 1 }}><Controller control={control} name="end_time" render={({ field }) => <TimeField label="Bitiş" value={field.value} onChange={field.onChange} error={errors.end_time?.message} />} /></View>
      </View>
      <AvailabilityNotice {...avail} />
      <DateField label="Opsiyon bitiş tarihi" value={expDate} onChange={(d) => setExpDate(d ?? expDate)} minDate={todayISO()} />
      <TimeField label="Opsiyon bitiş saati" value={expTime} onChange={setExpTime} />
      {blocked ? <Banner tone="danger" title={blocked} /> : null}
      <Button label="Opsiyona al" loading={s.pending} disabled={!!blocked} onPress={handleSubmit((x) => s.run(() => a.hold.mutateAsync({ ...x, expires_at: istanbulISO(expDate, expTime) })))} />
    </View>
  );
}

export function ExtendHoldSheet({ leadId, hold, visible, onClose }: SheetProps & { leadId: string; hold: VenueHold }) {
  return <BottomSheet visible={visible} title="Opsiyonu uzat" onClose={onClose}><ExtendForm leadId={leadId} hold={hold} onDone={onClose} /></BottomSheet>;
}
function ExtendForm({ leadId, hold, onDone }: { leadId: string; hold: VenueHold; onDone: () => void }) {
  const a = useLeadActions(leadId);
  const s = useSubmit(onDone, "Opsiyon uzatıldı");
  const [date, setDate] = useState(format(addDays(new Date(hold.expires_at), 3), "yyyy-MM-dd"));
  const [time, setTime] = useState("18:00");
  return (
    <View style={{ gap: 16 }}>
      {s.error ? <Banner reveal tone="danger" title="Kaydedilemedi" body={s.error} /> : null}
      <DateField label="Yeni bitiş tarihi" value={date} onChange={(d) => setDate(d ?? date)} minDate={todayISO()} />
      <TimeField label="Yeni bitiş saati" value={time} onChange={setTime} />
      <Button label="Uzat" loading={s.pending} onPress={() => s.run(() => a.extendHold.mutateAsync({ id: hold.id, expiresAt: istanbulISO(date, time) }))} />
    </View>
  );
}

// --- Teklif ------------------------------------------------------------------

export function QuoteSheet({ lead, venues, packages, visible, onClose }: SheetProps & { lead: LeadRow; venues: Venue[]; packages: Package[] }) {
  return <BottomSheet visible={visible} title="Teklif oluştur" onClose={onClose}><QuoteForm lead={lead} venues={venues} packages={packages} onDone={onClose} /></BottomSheet>;
}
function QuoteForm({ lead, venues, packages, onDone }: { lead: LeadRow; venues: Venue[]; packages: Package[]; onDone: () => void }) {
  const { colors } = useTheme();
  const { vertical: v } = useSessionContext();
  const a = useLeadActions(lead.id);
  const s = useSubmit(onDone, "Teklif oluşturuldu");
  const pkg = packages.find((p) => p.id === lead.package_id);
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<QuoteInput>({
    resolver: zodResolver(quoteSchema) as never,
    defaultValues: {
      lead_id: lead.id, venue_id: lead.venue_id ?? "none", package_id: lead.package_id ?? "none", guest_count: lead.guest_count ?? "",
      package_amount: packagePrice(pkg, lead.guest_count ?? 0), discount_amount: 0, valid_until: "", notes: "", items: [],
    },
  });
  const items = useFieldArray({ control, name: "items" });
  const packageId = watch("package_id"); const guests = Number(watch("guest_count")) || 0;
  const amt = Number(watch("package_amount")) || 0; const disc = Number(watch("discount_amount")) || 0;
  const watched = watch("items") ?? [];
  const totals = pricingTotals(amt, watched.map((i) => Number(i.amount) || 0), disc);
  const first = useMemo(() => ({ done: false }), []);
  useEffect(() => {
    // Paket / kişi sayısı değişince fiyatı yeniden öner (açılıştaki değer defaultValues'tan).
    if (!first.done) { first.done = true; return; }
    if (!packageId || packageId === "none") return;
    setValue("package_amount", packagePrice(packages.find((p) => p.id === packageId), guests), { shouldDirty: true });
  }, [packageId, guests]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ gap: 16 }}>
      {s.error ? <Banner reveal tone="danger" title="Kaydedilemedi" body={s.error} /> : null}
      {v.usesResource ? <Controller control={control} name="venue_id" render={({ field }) => (
        <SelectField label={v.resourceField} value={field.value ?? "none"} onChange={field.onChange} options={[{ value: "none", label: "Belirtilmedi" }, ...venues.filter((x) => x.is_active).map((x) => ({ value: x.id, label: x.name, color: x.color }))]} />
      )} /> : null}
      <Controller control={control} name="package_id" render={({ field }) => (
        <SelectField label="Paket" value={field.value ?? "none"} onChange={field.onChange} options={[{ value: "none", label: "Paketsiz" }, ...packages.filter((p) => p.is_active).map((p) => ({ value: p.id, label: p.name, hint: formatMoney(p.base_price) }))]} />
      )} />
      {v.usesGuestCount ? <Controller control={control} name="guest_count" render={({ field }) => (
        <TextField label="Kişi sayısı" keyboardType="number-pad" value={String(field.value ?? "")} onChangeText={(t) => field.onChange(t.replace(/\D/g, ""))} />
      )} /> : null}
      <Controller control={control} name="package_amount" render={({ field }) => <MoneyField compact label="Paket tutarı" value={Number(field.value) || 0} onChange={field.onChange} error={errors.package_amount?.message} />} />
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="headline">Ek hizmetler</Text>
          <Button label="Satır ekle" icon="plus" variant="ghost" size="S" fullWidth={false} onPress={() => items.append({ name: "", amount: 0 })} />
        </View>
        {items.fields.map((f, i) => (
          <View key={f.id} style={{ gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.bgSurfaceSunken }}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
              <View style={{ flex: 1 }}><Controller control={control} name={`items.${i}.name`} render={({ field }) => <TextField label="Hizmet" value={field.value} onChangeText={field.onChange} error={errors.items?.[i]?.name?.message} />} /></View>
              <IconButton icon="x" variant="tonal" size="M" label="Satırı sil" onPress={() => items.remove(i)} />
            </View>
            <Controller control={control} name={`items.${i}.amount`} render={({ field }) => <MoneyField compact label="Tutar" value={Number(field.value) || 0} onChange={field.onChange} />} />
          </View>
        ))}
      </View>
      <Controller control={control} name="discount_amount" render={({ field }) => <MoneyField compact label="İndirim" value={Number(field.value) || 0} onChange={field.onChange} error={errors.discount_amount?.message} />} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 14, borderRadius: radius.md, backgroundColor: colors.bgSurfaceSunken }}>
        <Text variant="subhead" color="textSecondary">Teklif toplamı</Text><Text variant="numericM">{formatMoney(totals.net)}</Text>
      </View>
      <Controller control={control} name="valid_until" render={({ field }) => <DateField label="Geçerlilik tarihi" value={field.value || null} onChange={(d) => field.onChange(d ?? "")} clearable placeholder="Belirtilmedi" minDate={todayISO()} />} />
      <Controller control={control} name="notes" render={({ field }) => <TextField label="Not" multiline value={field.value ?? ""} onChangeText={field.onChange} />} />
      <Button label="Teklifi oluştur" loading={s.pending} onPress={handleSubmit((x) => s.run(() => a.quote.mutateAsync(x)))} />
    </View>
  );
}

// --- Rezervasyona dönüştür ---------------------------------------------------

export function ConvertSheet({ detail, venues, packages, visible, onClose, onConverted }: SheetProps & { detail: LeadDetail; venues: Venue[]; packages: Package[]; onConverted: (reservationId: string) => void }) {
  return <BottomSheet visible={visible} title="Rezervasyona dönüştür" onClose={onClose}><ConvertForm detail={detail} venues={venues} packages={packages} onConverted={onConverted} /></BottomSheet>;
}
function ConvertForm({ detail, venues, packages, onConverted }: { detail: LeadDetail; venues: Venue[]; packages: Package[]; onConverted: (id: string) => void }) {
  const { colors } = useTheme();
  const { vertical: v } = useSessionContext();
  const convert = useConvertLead();
  const toast = useToast();
  const guard = useSubmitGuard();
  const [error, setError] = useState<string | null>(null);
  const { lead } = detail;
  const activeVenues = venues.filter((x) => x.is_active || x.id === lead.venue_id);
  const activeHold = detail.holds.find((h) => h.status === "aktif") ?? null;
  const source: Quote | null = detail.quotes.find((q) => q.status === "kabul") ?? detail.quotes[0] ?? null;

  const { control, handleSubmit, watch, formState: { errors } } = useForm<ConvertLeadInput>({
    resolver: zodResolver(convertLeadSchema) as never,
    defaultValues: {
      lead_id: lead.id, quote_id: source?.id ?? "none",
      venue_id: !v.usesResource ? (activeVenues.find((x) => x.allows_overlap) ?? activeVenues[0])?.id ?? "" : source?.venue_id ?? lead.venue_id ?? activeHold?.venue_id ?? activeVenues[0]?.id ?? "",
      package_id: source?.package_id ?? lead.package_id ?? "none",
      event_date: activeHold?.event_date ?? lead.event_date ?? "",
      start_time: activeHold?.start_time?.slice(0, 5) ?? lead.start_time?.slice(0, 5) ?? v.defaultTimes.start,
      end_time: activeHold?.end_time?.slice(0, 5) ?? lead.end_time?.slice(0, 5) ?? v.defaultTimes.end,
      guest_count: source?.guest_count ?? lead.guest_count ?? "",
      // Teklifin indirimi toplamına yansımış; tek tutar geçilir ki indirim iki kez sayılmasın.
      gross_amount: source?.total_amount ?? 0, discount_amount: 0, deposit_amount: 0, due_date: "", notes: lead.notes ?? "",
    },
  });
  const gross = Number(watch("gross_amount")) || 0; const disc = Number(watch("discount_amount")) || 0; const dep = Number(watch("deposit_amount")) || 0;
  const totals = pricingTotals(gross, [], disc);
  const venueId = watch("venue_id");
  const avail = useAvailabilityView({ venue: activeVenues.find((x) => x.id === venueId) ?? null, eventDate: watch("event_date"), startTime: watch("start_time"), endTime: watch("end_time") });
  const blocked = submitBlockedReason(avail.view, v);

  return (
    <View style={{ gap: 16 }}>
      <Text variant="subhead" color="textSecondary">Bilgiler talepten ve teklifden dolduruldu. Kontrol edip onaylayın.</Text>
      {error ? <Banner reveal tone="danger" title="Dönüştürülemedi" body={error} /> : null}
      {detail.quotes.length > 0 ? <Controller control={control} name="quote_id" render={({ field }) => (
        <SelectField label="Kabul edilen teklif" value={field.value ?? "none"} onChange={field.onChange} options={[{ value: "none", label: "Teklifsiz" }, ...detail.quotes.map((q) => ({ value: q.id, label: `${q.quote_number} · ${q.version}. sürüm`, hint: formatMoney(q.total_amount) }))]} />
      )} /> : null}
      {v.usesResource ? <Controller control={control} name="venue_id" render={({ field }) => (
        <SelectField label={v.resourceField} value={field.value || null} onChange={field.onChange} error={errors.venue_id?.message} options={activeVenues.map((x) => ({ value: x.id, label: x.name, color: x.color }))} />
      )} /> : null}
      <Controller control={control} name="event_date" render={({ field }) => <DateField label="Tarih" value={field.value || null} onChange={(d) => field.onChange(d ?? "")} error={errors.event_date?.message} />} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Controller control={control} name="start_time" render={({ field }) => <TimeField label="Başlangıç" value={field.value} onChange={field.onChange} error={errors.start_time?.message} />} /></View>
        <View style={{ flex: 1 }}><Controller control={control} name="end_time" render={({ field }) => <TimeField label="Bitiş" value={field.value} onChange={field.onChange} error={errors.end_time?.message} />} /></View>
      </View>
      {v.usesResource ? <AvailabilityNotice {...avail} /> : null}
      <Controller control={control} name="package_id" render={({ field }) => (
        <SelectField label="Paket" value={field.value ?? "none"} onChange={field.onChange} options={[{ value: "none", label: "Paketsiz" }, ...packages.filter((p) => p.is_active || p.id === lead.package_id).map((p) => ({ value: p.id, label: p.name }))]} />
      )} />
      {v.usesGuestCount ? <Controller control={control} name="guest_count" render={({ field }) => <TextField label="Kişi sayısı" keyboardType="number-pad" value={String(field.value ?? "")} onChangeText={(t) => field.onChange(t.replace(/\D/g, ""))} />} /> : null}
      <Controller control={control} name="gross_amount" render={({ field }) => <MoneyField compact label="Toplam fiyat" value={Number(field.value) || 0} onChange={field.onChange} error={errors.gross_amount?.message} />} />
      <Controller control={control} name="discount_amount" render={({ field }) => <MoneyField compact label="İndirim" value={Number(field.value) || 0} onChange={field.onChange} error={errors.discount_amount?.message} />} />
      <Controller control={control} name="deposit_amount" render={({ field }) => <MoneyField compact label="Alınan kapora" value={Number(field.value) || 0} onChange={field.onChange} error={errors.deposit_amount?.message} />} />
      <View style={{ gap: 4, padding: 14, borderRadius: radius.md, backgroundColor: colors.bgSurfaceSunken }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text variant="subhead" color="textSecondary">Net satış</Text><Text variant="numericM">{formatMoney(totals.net)}</Text></View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text variant="subhead" color="textSecondary">Kalan</Text><Text variant="numericM">{formatMoney(Math.max(0, totals.net - dep))}</Text></View>
      </View>
      <Controller control={control} name="due_date" render={({ field }) => <DateField label="Kalan ödeme tarihi" value={field.value || null} onChange={(d) => field.onChange(d ?? "")} clearable placeholder="Belirtilmedi" />} />
      <Controller control={control} name="notes" render={({ field }) => <TextField label="Notlar" multiline value={field.value ?? ""} onChangeText={field.onChange} />} />
      {blocked ? <Banner tone="danger" title={blocked} /> : null}
      <Button label="Rezervasyonu oluştur" loading={guard.pending} disabled={!!blocked} onPress={handleSubmit((x) => guard.run(async () => {
        setError(null);
        const r = await convert.mutateAsync(x);
        if (!r.ok) return setError(r.error);
        toast({ tone: "success", message: "Rezervasyon oluşturuldu" });
        onConverted(r.reservationId);
      }))} />
    </View>
  );
}
