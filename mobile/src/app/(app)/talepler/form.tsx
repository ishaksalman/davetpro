import { FormScrollView } from "~/ui/FormScroll";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Controller } from "react-hook-form";
import { useForm } from "~/lib/use-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LEAD_SOURCE_LABELS, ORGANIZATION_TYPE_LABELS, enumOptions } from "@/lib/constants";
import { formatPhone } from "@/lib/format";
import { leadSchema, type LeadInput } from "@/lib/schemas";
import { todayISO } from "@/lib/time";
import { useSessionContext } from "~/lib/auth/session";
import { useLead, useMembers, useSaveLead } from "~/lib/data/leads";
import { useLookups } from "~/lib/data/lookups";
import { submitBlockedReason } from "~/lib/domain/availability";
import { istanbulISO, leadDefaults, matchCustomerByPhone } from "~/lib/domain/leads";
import { useSubmitGuard } from "~/lib/hooks";
import { useTheme } from "~/design/theme";
import { Banner, ConfirmDialog, ErrorState, Skeleton, useToast } from "~/ui/Feedback";
import { Button } from "~/ui/Button";
import { SegmentedControl, TextField, TimeField } from "~/ui/Inputs";
import { DateField, SelectField } from "~/ui/Pickers";
import { Text } from "~/ui/Text";
import { AvailabilityNotice, useAvailabilityView } from "~/features/availability-notice";
import type { Customer, Lead, Package, Venue } from "@/lib/database.types";

export default function LeadFormRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const lookups = useLookups();
  const detail = useLead(id ?? "");
  const members = useMembers();
  const bad = lookups.isError || (id && detail.isError);
  if (bad) return <View style={{ flex: 1, backgroundColor: colors.bgCanvas, paddingTop: 60 }}><ErrorState onRetry={() => { lookups.refetch(); detail.refetch(); }} /></View>;
  if (lookups.isLoading || !lookups.data || (id && (detail.isLoading || !detail.data))) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas, padding: 16, paddingTop: 70, gap: 16 }}><Skeleton height={52} radius={12} /><Skeleton height={52} radius={12} /><Skeleton height={52} radius={12} /></View>;
  }
  return <LeadForm key={id ?? "yeni"} lead={id ? detail.data!.lead : null} customers={lookups.data.customers} venues={lookups.data.venues} packages={lookups.data.packages} members={members.data ?? []} />;
}

function LeadForm({ lead, customers, venues, packages, members }: { lead: Lead | null; customers: Customer[]; venues: Venue[]; packages: Package[]; members: { id: string; full_name: string }[] }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { vertical: v } = useSessionContext();
  const guard = useSubmitGuard();
  const save = useSaveLead();
  const isEdit = !!lead;
  const [mode, setMode] = useState<"yeni" | "kayitli">(isEdit ? "kayitli" : "yeni");
  const [formError, setFormError] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const [fuDate, setFuDate] = useState<string | null>(lead?.next_follow_up_at ? lead.next_follow_up_at.slice(0, 10) : null);
  const [fuTime, setFuTime] = useState("10:00");

  const customer = lead ? customers.find((c) => c.id === lead.customer_id) ?? null : null;
  const defaults = useMemo(() => leadDefaults({ lead, customer, vertical: v, venues }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const { scroll, control, handleSubmit, setValue, watch, formState: { errors, isDirty } } = useForm<LeadInput>({ resolver: zodResolver(leadSchema) as never, defaultValues: defaults });

  const phone = watch("phone");
  const venueId = watch("venue_id"); const date = watch("event_date"); const st = watch("start_time"); const et = watch("end_time");
  const activeVenues = venues.filter((x) => x.is_active || x.id === lead?.venue_id);
  const match = mode === "yeni" ? matchCustomerByPhone(customers, String(phone ?? "")) : null;
  const venue = activeVenues.find((x) => x.id === venueId) ?? null;
  const avail = useAvailabilityView({ venue, eventDate: date ?? "", startTime: st ?? "", endTime: et ?? "" });
  const blocked = submitBlockedReason(avail.view, v);

  const submit = handleSubmit((values) => guard.run(async () => {
    setFormError(null);
    const payload: LeadInput = { ...values, customer_id: mode === "kayitli" ? values.customer_id : "none", next_follow_up_at: fuDate ? istanbulISO(fuDate, fuTime) : "" };
    if (mode === "kayitli" && (!payload.customer_id || payload.customer_id === "none")) return setFormError("Bir müşteri seçin.");
    const r = await save.mutateAsync(payload);
    if (!r.ok) return setFormError(r.error);
    toast({ tone: "success", message: isEdit ? "Talep güncellendi" : "Talep oluşturuldu" });
    if (isEdit) router.back(); else router.replace({ pathname: "/talepler/[id]", params: { id: r.id } });
  }));
  // Müsaitlik engeli varken Kaydet pasif görünmez: dokunulunca nedenin yazdığı banda kaydırılır.
  const go = () => { if (blocked) { scroll.scrollToTop(); return; } void submit(); };
  const close = () => (isDirty ? setDiscard(true) : router.back());

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bgCanvas }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ paddingTop: 20, height: 64, justifyContent: "center" }}>
        <View style={{ height: 44, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, justifyContent: "space-between" }}>
          <Pressable onPress={close} hitSlop={8} accessibilityRole="button"><Text variant="body" color="textLink">Vazgeç</Text></Pressable>
          <Text variant="headline">{isEdit ? "Talebi düzenle" : "Yeni talep"}</Text>
          <Pressable onPress={go} disabled={guard.pending} hitSlop={8} accessibilityRole="button"><Text variant="headline" color={guard.pending ? "textDisabled" : blocked ? "textTertiary" : "textLink"}>Kaydet</Text></Pressable>
        </View>
      </View>
      <FormScrollView controller={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}>
        {formError ? <Banner reveal tone="danger" title="Kaydedilemedi" body={formError} /> : null}
        {blocked ? <Banner tone="danger" title={blocked} /> : null}

        {isEdit ? (
          <TextField label="Müşteri" value={customer?.full_name ?? ""} onChangeText={() => {}} disabled helper="Müşteri sonradan değiştirilemez." />
        ) : (
          <>
            <SegmentedControl options={[{ value: "yeni", label: "Yeni müşteri" }, { value: "kayitli", label: "Kayıtlı müşteri" }]} value={mode} onChange={(m) => { setMode(m); if (m === "yeni") setValue("customer_id", "none"); }} />
            {mode === "kayitli" ? (
              <Controller control={control} name="customer_id" render={({ field }) => (
                <SelectField label="Müşteri" value={field.value && field.value !== "none" ? field.value : null} onChange={field.onChange} placeholder="Müşteri seçin" searchPlaceholder="Ad veya telefon ara…" options={customers.map((c) => ({ value: c.id, label: c.full_name, hint: formatPhone(c.phone) }))} />
              )} />
            ) : (
              <>
                <Controller control={control} name="full_name" render={({ field }) => <TextField label="Ad soyad" icon="user" autoCapitalize="words" value={field.value} onChangeText={field.onChange} error={errors.full_name?.message} />} />
                <Controller control={control} name="phone" render={({ field }) => <TextField label="Telefon" icon="phone" keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} error={errors.phone?.message} />} />
                {match ? <Banner tone="info" title={`Bu telefonla kayıtlı müşteri var: ${match.full_name}`} body="Kayıt mevcut müşteriye bağlanır, yeni müşteri açılmaz." /> : null}
              </>
            )}
          </>
        )}

        <Controller control={control} name="organization_type" render={({ field }) => (
          <SelectField label={v.eventTypeLabel} value={field.value} onChange={field.onChange} options={v.eventTypes.map((t) => ({ value: t, label: ORGANIZATION_TYPE_LABELS[t] }))} />
        )} />
        <Controller control={control} name="source" render={({ field }) => <SelectField label="Kaynak" value={field.value} onChange={field.onChange} options={enumOptions(LEAD_SOURCE_LABELS)} />} />
        {v.usesResource ? (
          <Controller control={control} name="venue_id" render={({ field }) => (
            <SelectField label={v.resourceField} value={field.value ?? "none"} onChange={field.onChange} options={[{ value: "none", label: "Henüz belli değil" }, ...activeVenues.map((x) => ({ value: x.id, label: x.name, color: x.color }))]} />
          )} />
        ) : null}
        <Controller control={control} name="event_date" render={({ field }) => <DateField label="Tarih (isteğe bağlı)" value={field.value || null} onChange={(d) => field.onChange(d ?? "")} clearable placeholder="Henüz belli değil" error={errors.event_date?.message as string | undefined} />} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}><Controller control={control} name="start_time" render={({ field }) => <TimeField label="Başlangıç" value={field.value ?? ""} onChange={field.onChange} error={errors.start_time?.message as string | undefined} />} /></View>
          <View style={{ flex: 1 }}><Controller control={control} name="end_time" render={({ field }) => <TimeField label="Bitiş" value={field.value ?? ""} onChange={field.onChange} error={errors.end_time?.message as string | undefined} />} /></View>
        </View>
        {v.usesResource ? <AvailabilityNotice {...avail} /> : null}
        <Controller control={control} name="package_id" render={({ field }) => (
          <SelectField label="Paket" value={field.value ?? "none"} onChange={field.onChange} options={[{ value: "none", label: "Belli değil" }, ...packages.filter((p) => p.is_active || p.id === lead?.package_id).map((p) => ({ value: p.id, label: p.name }))]} />
        )} />
        {v.usesGuestCount ? <Controller control={control} name="guest_count" render={({ field }) => <TextField label="Tahmini kişi" keyboardType="number-pad" value={String(field.value ?? "")} onChangeText={(t) => field.onChange(t.replace(/\D/g, ""))} />} /> : null}
        {members.length > 1 ? (
          <Controller control={control} name="assigned_to" render={({ field }) => (
            <SelectField label="İlgilenen kişi" value={field.value ?? "none"} onChange={field.onChange} options={[{ value: "none", label: "Atanmadı" }, ...members.map((m) => ({ value: m.id, label: m.full_name }))]} />
          )} />
        ) : null}
        <DateField label="Takip tarihi" value={fuDate} onChange={setFuDate} clearable placeholder="Belirtilmedi" minDate={todayISO()} />
        {fuDate ? <TimeField label="Takip saati" value={fuTime} onChange={setFuTime} /> : null}
        <Controller control={control} name="notes" render={({ field }) => <TextField label="Notlar" multiline placeholder={v.notesPlaceholder} value={field.value ?? ""} onChangeText={field.onChange} />} />
        <Button label={isEdit ? "Değişiklikleri kaydet" : "Talebi kaydet"} loading={guard.pending} onPress={go} />
      </FormScrollView>
      <ConfirmDialog visible={discard} destructive title="Değişiklikler silinsin mi?" message="Kaydedilmemiş girdileriniz kaybolacak." confirmLabel="Sil ve çık" onConfirm={() => { setDiscard(false); router.back(); }} onCancel={() => setDiscard(false)} />
    </KeyboardAvoidingView>
  );
}
