import { FormScrollView } from "~/ui/FormScroll";
import { useForm } from "~/lib/use-form";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useFieldArray } from "react-hook-form";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { formatMoney, formatNumber, formatPhone } from "@/lib/format";
import type { ReservationInput } from "@/lib/schemas";
import { submitBlockedReason } from "~/lib/domain/availability";
import { perGuestTotal, pricingTotals } from "~/lib/domain/reservation-payload";
import { reservationDefaults, reservationResolver, selectablePackages } from "~/lib/domain/reservation-form";
import { useAppSession, useSessionContext } from "~/lib/auth/session";
import { useLookups } from "~/lib/data/lookups";
import { useReservation, useSaveReservation } from "~/lib/data/reservations";
import { useSubmitGuard } from "~/lib/hooks";
import { useTheme } from "~/design/theme";
import { radius } from "~/design/tokens";
import { Banner, ConfirmDialog, ErrorState, Skeleton, useToast } from "~/ui/Feedback";
import { Button, IconButton } from "~/ui/Button";
import { MoneyField, SegmentedControl, TextField, TimeField } from "~/ui/Inputs";
import { DateField, SelectField } from "~/ui/Pickers";
import { Text } from "~/ui/Text";
import { Icon } from "~/ui/Icon";
import { AvailabilityNotice, useAvailabilityView } from "~/features/availability-notice";
import { CustomerSheet } from "~/features/customer-sheet";
import type { Customer, Package, Team, Venue } from "@/lib/database.types";
import type { EditableReservation } from "~/lib/domain/reservation-form";

/** Oluşturma ve düzenleme: modal. `id` verilirse düzenleme; `tarih` ön dolgu (takvimden). */
/** iOS "modal" sayfası zaten durum çubuğunun altında başlar; güvenli alanı bir kez daha eklemek üstte boşluk bırakırdı. */
const MODAL_TOP = 20;

export default function ReservationFormRoute() {
  const { id, tarih, salon } = useLocalSearchParams<{ id?: string; tarih?: string; salon?: string }>();
  const lookups = useLookups();
  const existing = useReservation(id ?? "");
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const header = (
    <View style={{ paddingTop: MODAL_TOP, backgroundColor: colors.bgCanvas }}>
      <View style={{ height: 44, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, justifyContent: "space-between" }}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button"><Text variant="body" color="textLink">Vazgeç</Text></Pressable>
        <Text variant="headline">{id ? "Rezervasyonu düzenle" : "Yeni rezervasyon"}</Text>
        <View style={{ width: 52 }} />
      </View>
    </View>
  );

  if (lookups.isError || (id && existing.isError)) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>{header}<ErrorState onRetry={() => { lookups.refetch(); existing.refetch(); }} /></View>;
  }
  if (lookups.isLoading || !lookups.data || (id && (existing.isLoading || !existing.data))) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>{header}<View style={{ padding: 16, gap: 16 }}><Skeleton height={52} radius={12} /><Skeleton height={52} radius={12} /><Skeleton height={52} radius={12} /></View></View>;
  }
  return (
    <ReservationForm
      key={id ?? "yeni"}
      reservation={id ? existing.data ?? null : null}
      customers={lookups.data.customers} venues={lookups.data.venues} packages={lookups.data.packages} teams={lookups.data.teams}
      defaults={{ event_date: tarih, venue_id: salon }}
    />
  );
}

function ReservationForm({
  reservation, customers, venues, packages, teams, defaults,
}: {
  reservation: EditableReservation | null; customers: Customer[]; venues: Venue[]; packages: Package[]; teams: Team[];
  defaults: { event_date?: string; venue_id?: string };
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  useAppSession();
  const { vertical: v, canFinance } = useSessionContext();
  const guard = useSubmitGuard();
  const save = useSaveReservation(canFinance);
  const isEdit = !!reservation;
  const [customerSheet, setCustomerSheet] = useState(false);
  const [discardAsk, setDiscardAsk] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const activeVenues = venues.filter((x) => x.is_active || x.id === reservation?.venue_id);
  const disMekan = activeVenues.find((x) => x.allows_overlap);
  const kendiMekanlari = activeVenues.filter((x) => !x.allows_overlap);
  const activeTeams = teams.filter((t) => t.is_active || t.id === reservation?.team_id);

  const defaultValues = useMemo(
    () => reservationDefaults({ reservation, defaults: { event_date: defaults.event_date, venue_id: defaults.venue_id }, vertical: v, venues }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const form = useForm<ReservationInput>({ resolver: reservationResolver(canFinance), defaultValues });
  const { control, handleSubmit, setValue, watch, scroll, formState: { errors, isDirty, dirtyFields } } = form;
  const items = useFieldArray({ control, name: "items" });

  const venueId = watch("venue_id");
  const eventDate = watch("event_date");
  const startTime = watch("start_time");
  const endTime = watch("end_time");
  const packageId = watch("package_id");
  const pricingType = watch("pricing_type");
  const perGuest = pricingType === "kisi_basi";
  const unitPrice = Number(watch("unit_price")) || 0;
  const guestCount = Number(watch("guest_count")) || 0;
  const packageAmount = Number(watch("package_amount")) || 0;
  const watchedItems = watch("items") ?? [];
  const discount = Number(watch("discount_amount")) || 0;
  const totals = pricingTotals(packageAmount, watchedItems.map((i) => Number(i.amount) || 0), discount);

  const venue = activeVenues.find((x) => x.id === venueId) ?? null;
  const avail = useAvailabilityView({ venue, eventDate, startTime, endTime, ignoreReservationId: reservation?.id });
  const blocked = submitBlockedReason(avail.view, v);

  const pkgs = selectablePackages(packages, venueId, reservation?.package_id);

  // Salon değişince seçili paket artık geçerli değilse temizle (yanlış salona ait paketle kayıt olmasın).
  useEffect(() => {
    if (!packageId || packageId === "none") return;
    if (!pkgs.some((p) => p.id === packageId)) setValue("package_id", "none", { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  // Kalan ödeme tarihi yeni kayıtta organizasyon tarihini izler (dokunulmadıkça): boş kalırsa hatırlatma kapanıyordu.
  useEffect(() => {
    if (isEdit || dirtyFields.due_date) return;
    setValue("due_date", eventDate || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventDate, isEdit, dirtyFields.due_date]);

  // Kişi başı modda toplam = birim × kişi (kaydedilen yine tek tutar: gross).
  useEffect(() => {
    if (!perGuest) return;
    const total = perGuestTotal(unitPrice, guestCount);
    if (total !== packageAmount) setValue("package_amount", total, { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perGuest, unitPrice, guestCount]);

  // Paket seçilince fiyat öner (yeni kayıtta); düzenlemede mevcut fiyatın üstüne yazılmaz.
  useEffect(() => {
    if (isEdit || !packageId || packageId === "none") return;
    const sel = pkgs.find((p) => p.id === packageId);
    if (!sel) return;
    setValue("pricing_type", sel.pricing_type, { shouldDirty: true });
    if (sel.pricing_type === "kisi_basi") setValue("unit_price", sel.base_price, { shouldDirty: true });
    else { setValue("unit_price", 0, { shouldDirty: true }); setValue("package_amount", sel.base_price, { shouldDirty: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId]);

  // Müsaitlik engeli varken Kaydet pasif görünmez: dokunulunca nedenin yazdığı banda kaydırılır.
  const submit = () => { if (blocked) { scroll.scrollToTop(); return; } void onSubmit(); };
  const close = () => (isDirty ? setDiscardAsk(true) : router.back());

  const onSubmit = handleSubmit((values) =>
    guard.run(async () => {
      setFormError(null);
      // Fotoğrafçıda "Konum"un kendisi adres; salonda boş.
      const r = await save.mutateAsync(values);
      if (!r.ok) return setFormError(r.error); // girdiler korunur
      toast({ tone: "success", message: isEdit ? "Rezervasyon güncellendi" : "Rezervasyon oluşturuldu" });
      if (isEdit) router.back();
      else router.replace({ pathname: "/rezervasyon/[id]", params: { id: r.id } });
    }),
  );

  const showLocation = v.usesLocation && (!v.usesLocationChoice || (disMekan != null && venueId === disMekan.id));
  const ownVenueChosen = v.usesLocationChoice && disMekan != null && venueId !== disMekan.id;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bgCanvas }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ paddingTop: MODAL_TOP }}>
        <View style={{ height: 44, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, justifyContent: "space-between" }}>
          <Pressable onPress={close} hitSlop={8} accessibilityRole="button"><Text variant="body" color="textLink">Vazgeç</Text></Pressable>
          <Text variant="headline">{isEdit ? "Rezervasyonu düzenle" : "Yeni rezervasyon"}</Text>
          <Pressable onPress={submit} disabled={guard.pending} hitSlop={8} accessibilityRole="button" accessibilityState={{ disabled: guard.pending }}>
            <Text variant="headline" color={guard.pending ? "textDisabled" : blocked ? "textTertiary" : "textLink"}>Kaydet</Text>
          </Pressable>
        </View>
      </View>

      <FormScrollView controller={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}>
        {formError ? <Banner reveal tone="danger" title="Kaydedilemedi" body={formError} /> : null}
        {blocked ? <Banner tone="danger" title={blocked} /> : null}

        <Controller control={control} name="customer_id" render={({ field }) => (
          <View style={{ gap: 8 }}>
            <SelectField
              label="Müşteri" value={field.value || null} onChange={field.onChange} error={errors.customer_id?.message} placeholder="Müşteri seçin"
              searchPlaceholder="Ad veya telefon ara…" emptyText="Bu aramaya uyan müşteri yok."
              options={customers.map((c) => ({ value: c.id, label: c.full_name, hint: formatPhone(c.phone) }))}
            />
            <Button label="Yeni müşteri ekle" icon="user-plus" variant="ghost" size="S" fullWidth={false} onPress={() => setCustomerSheet(true)} />
          </View>
        )} />

        {v.usesLocationChoice && disMekan ? (
          <View style={{ gap: 8 }}>
            <Text variant="footnoteMedium" color="textSecondary">Organizasyon konumu</Text>
            {[
              { dis: true, title: "Dış mekânda / müşteri adresinde", sub: "Aynı saatte birden fazla iş olabilir." },
              { dis: false, title: "Kendi mekânımızda", sub: kendiMekanlari.length === 0 ? "Önce bir mekân tanımlamanız gerekir." : "Aynı mekâna aynı saate ikinci iş alınmaz." },
            ].map((o) => {
              const sel = o.dis ? venueId === disMekan.id : venueId !== disMekan.id;
              return (
                <Pressable
                  key={String(o.dis)} accessibilityRole="radio" accessibilityState={{ selected: sel }}
                  onPress={() => setValue("venue_id", o.dis ? disMekan.id : (kendiMekanlari[0]?.id ?? ""), { shouldDirty: true })}
                  style={{ padding: 14, borderRadius: radius.md, borderWidth: sel ? 1.5 : 1, borderColor: sel ? colors.borderFocus : colors.borderDefault, backgroundColor: sel ? colors.actionAccentSubtle : colors.bgSurface, flexDirection: "row", gap: 12, alignItems: "center" }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyMedium">{o.title}</Text>
                    <Text variant="footnote" color="textSecondary">{o.sub}</Text>
                  </View>
                  {sel ? <Icon name="check" size={20} color="textLink" /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {v.usesResource && (!v.usesLocationChoice || ownVenueChosen) ? (
          kendiMekanlari.length === 0 && v.usesLocationChoice ? (
            <Banner tone="info" title="Tanımlı mekânınız yok" body={`Kendi mekânınızda yapılan işler için önce ${v.resource.plural.toLocaleLowerCase("tr-TR")} ekleyin. Dış mekânda yapılan işler için buna gerek yok.`} />
          ) : (
            <Controller control={control} name="venue_id" render={({ field }) => (
              <SelectField
                label={v.resourceField} value={field.value || null} onChange={field.onChange} error={errors.venue_id?.message} placeholder={`${v.resource.singular} seçin`}
                options={(v.usesLocationChoice ? kendiMekanlari : activeVenues).map((x) => ({ value: x.id, label: x.name, color: x.color }))}
              />
            )} />
          )
        ) : null}

        <Controller control={control} name="organization_type" render={({ field }) => (
          <SelectField label={v.eventTypeLabel} value={field.value} onChange={field.onChange} options={v.eventTypes.map((t) => ({ value: t, label: ORGANIZATION_TYPE_LABELS[t] }))} />
        )} />

        <Controller control={control} name="event_date" render={({ field }) => (
          <DateField label="Tarih" value={field.value || null} onChange={(d) => field.onChange(d ?? "")} error={errors.event_date?.message} />
        )} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}><Controller control={control} name="start_time" render={({ field }) => <TimeField label="Başlangıç" value={field.value} onChange={field.onChange} error={errors.start_time?.message} />} /></View>
          <View style={{ flex: 1 }}><Controller control={control} name="end_time" render={({ field }) => <TimeField label="Bitiş" value={field.value} onChange={field.onChange} error={errors.end_time?.message} />} /></View>
        </View>
        {v.usesResource ? <AvailabilityNotice {...avail} /> : null}

        <Controller control={control} name="package_id" render={({ field }) => (
          <SelectField
            label="Paket" value={field.value ?? "none"} onChange={field.onChange}
            options={[{ value: "none", label: "Paketsiz" }, ...pkgs.map((p) => ({ value: p.id, label: p.name, hint: `${p.base_price > 0 ? formatMoney(p.base_price) : ""}${p.pricing_type === "kisi_basi" ? " / kişi" : ""}`.trim() || undefined }))]}
          />
        )} />

        {v.usesGuestCount ? (
          <Controller control={control} name="guest_count" render={({ field }) => (
            <TextField label="Tahmini kişi" placeholder="400" keyboardType="number-pad" value={String(field.value ?? "")} onChangeText={(t) => field.onChange(t.replace(/\D/g, ""))} error={errors.guest_count?.message} />
          )} />
        ) : null}

        {v.usesTeams && activeTeams.length > 0 ? (
          <Controller control={control} name="team_id" render={({ field }) => (
            <SelectField label="Ekip (zorunlu değil)" value={field.value ?? "none"} onChange={(x) => field.onChange(x === "none" ? null : x)} options={[{ value: "none", label: "Atanmadı" }, ...activeTeams.map((t) => ({ value: t.id, label: t.name, hint: t.members ?? undefined, color: t.color }))]} />
          )} />
        ) : null}

        {showLocation ? (
          <Controller control={control} name="location" render={({ field }) => (
            <TextField
              label={v.usesLocationChoice ? "Organizasyon adresi" : v.usesResource ? "Etkinlik adresi" : "Çekim konumu"}
              helper="Takvimde ve sözleşmede görünür."
              placeholder={v.usesResource ? "Mekân adı, mahalle, ilçe" : "Örn. Kordon, Alsancak, İzmir"}
              value={field.value ?? ""} onChangeText={field.onChange} error={errors.location?.message}
            />
          )} />
        ) : null}

        {canFinance ? (
          <View style={{ gap: 16 }}>
            <View style={{ height: 1, backgroundColor: colors.borderSubtle }} />
            {v.usesPerGuestPricing ? (
              <Controller control={control} name="pricing_type" render={({ field }) => (
                <SegmentedControl options={[{ value: "sabit", label: "Sabit fiyat" }, { value: "kisi_basi", label: "Kişi başı fiyat" }]} value={field.value} onChange={field.onChange} />
              )} />
            ) : null}
            {perGuest ? (
              <Controller control={control} name="unit_price" render={({ field }) => (
                <MoneyField compact label="Kişi başı fiyat" value={Number(field.value) || 0} onChange={field.onChange} hint={`${formatNumber(guestCount)} kişi ile çarpılır.`} error={errors.unit_price?.message} />
              )} />
            ) : (
              <Controller control={control} name="package_amount" render={({ field }) => (
                <MoneyField compact label="Paket / anlaşılan fiyat" value={Number(field.value) || 0} onChange={field.onChange} error={errors.package_amount?.message} />
              )} />
            )}
            <Controller control={control} name="discount_amount" render={({ field }) => (
              <MoneyField compact label="İndirim" value={Number(field.value) || 0} onChange={field.onChange} error={errors.discount_amount?.message} />
            )} />

            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text variant="headline">Ek hizmetler</Text>
                <Button label="Satır ekle" icon="plus" variant="ghost" size="S" fullWidth={false} onPress={() => items.append({ name: "", amount: 0 })} />
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {v.suggestedExtras.filter((e) => !watchedItems.some((i) => i.name === e.name)).map((e) => (
                  <Pressable key={e.name} onPress={() => items.append(e)} accessibilityRole="button" style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.bgSurfaceSunken }}>
                    <Text variant="caption" color="textSecondary">+ {e.name}</Text>
                  </Pressable>
                ))}
              </View>
              {items.fields.map((f, i) => (
                <View key={f.id} style={{ gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Controller control={control} name={`items.${i}.name`} render={({ field }) => <TextField label="Hizmet" placeholder="Dış çekim" value={field.value} onChangeText={field.onChange} error={errors.items?.[i]?.name?.message} />} />
                    </View>
                    <IconButton icon="x" variant="tonal" size="M" label="Satırı sil" onPress={() => items.remove(i)} />
                  </View>
                  <Controller control={control} name={`items.${i}.amount`} render={({ field }) => <MoneyField compact label="Tutar" value={Number(field.value) || 0} onChange={field.onChange} error={errors.items?.[i]?.amount?.message} />} />
                </View>
              ))}
            </View>

            <View style={{ gap: 6, padding: 14, borderRadius: radius.md, backgroundColor: colors.bgSurfaceSunken }}>
              {perGuest ? (
                <Text variant="footnote" color="textSecondary">{guestCount > 0 ? `${formatMoney(unitPrice)} × ${formatNumber(guestCount)} kişi = ${formatMoney(packageAmount)}` : "Kişi başı fiyat için kişi sayısı girin"}</Text>
              ) : null}
              {totals.extras > 0 ? <Text variant="footnote" color="textSecondary">{formatMoney(packageAmount)} + {formatMoney(totals.extras)} = {formatMoney(totals.gross)}</Text> : null}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text variant="subhead" color="textSecondary">Net satış tutarı</Text>
                <Text variant="numericM">{formatMoney(totals.net)}</Text>
              </View>
            </View>

            <Controller control={control} name="deposit_amount" render={({ field }) => (
              <MoneyField compact label={isEdit ? "Kapora tahsilatı ekle" : "Alınan kapora"} value={Number(field.value) || 0} onChange={field.onChange} error={errors.deposit_amount?.message} hint={isEdit ? "Girilen tutar yeni bir tahsilat satırı açar; mevcut tahsilatlar değişmez." : undefined} />
            )} />
            <Controller control={control} name="due_date" render={({ field }) => (
              <DateField label="Kalan ödeme tarihi" value={field.value ?? null} onChange={(d) => field.onChange(d ?? undefined)} clearable placeholder="Belirtilmedi" error={errors.due_date?.message as string | undefined} />
            )} />
          </View>
        ) : null}

        <Controller control={control} name="notes" render={({ field }) => (
          <TextField label="Notlar" placeholder={v.notesPlaceholder} multiline value={field.value ?? ""} onChangeText={field.onChange} error={errors.notes?.message} />
        )} />

        <Button label={isEdit ? "Değişiklikleri kaydet" : "Rezervasyonu kaydet"} loading={guard.pending} onPress={submit} />
      </FormScrollView>

      <CustomerSheet visible={customerSheet} onClose={() => setCustomerSheet(false)} onSaved={(cid) => setValue("customer_id", cid, { shouldDirty: true, shouldValidate: true })} />
      <ConfirmDialog visible={discardAsk} title="Değişiklikler silinsin mi?" message="Kaydedilmemiş girdileriniz kaybolacak." confirmLabel="Sil ve çık" destructive onConfirm={() => { setDiscardAsk(false); router.back(); }} onCancel={() => setDiscardAsk(false)} />
    </KeyboardAvoidingView>
  );
}
