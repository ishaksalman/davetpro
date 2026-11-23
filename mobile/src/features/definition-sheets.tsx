import { useState } from "react";
import { Pressable, View } from "react-native";
import { Controller, useFieldArray } from "react-hook-form";
import { useForm } from "~/lib/use-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PRICING_TYPE_LABELS, VENUE_COLORS, enumOptions } from "@/lib/constants";
import { packageSchema, teamSchema, venueSchema, type PackageInput, type TeamInput, type VenueInput } from "@/lib/schemas";
import type { Package, Team, Venue } from "@/lib/database.types";
import { useSessionContext } from "~/lib/auth/session";
import { useSavePackage, useSaveTeam, useSaveVenue } from "~/lib/data/management";
import { useSubmitGuard } from "~/lib/hooks";
import { useTheme } from "~/design/theme";
import { Banner, useToast } from "~/ui/Feedback";
import { Button } from "~/ui/Button";
import { Icon } from "~/ui/Icon";
import { MoneyField, SegmentedControl, Switch, TextField } from "~/ui/Inputs";
import { SelectField } from "~/ui/Pickers";
import { BottomSheet } from "~/ui/Sheet";
import { Text } from "~/ui/Text";

type Base = { visible: boolean; onClose: () => void };

function useDone(onClose: () => void, ok: string) {
  const toast = useToast();
  const guard = useSubmitGuard();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    guard.run(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) return setError(r.error ?? "Kaydedilemedi.");
      toast({ tone: "success", message: ok });
      onClose();
    });
  return { run, pending: guard.pending, error };
}

function ActiveRow({ value, onChange, label, help }: { value: boolean; onChange: (v: boolean) => void; label: string; help: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}><Text variant="bodyMedium">{label}</Text><Text variant="footnote" color="textSecondary">{help}</Text></View>
      <Switch value={value} onValueChange={onChange} label={label} />
    </View>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text variant="footnoteMedium" color="textSecondary">Takvim rengi</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {VENUE_COLORS.map((c) => (
          <Pressable key={c} accessibilityRole="radio" accessibilityState={{ selected: value === c }} accessibilityLabel={`Renk ${c}`} onPress={() => onChange(c)}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, alignItems: "center", justifyContent: "center", borderWidth: value === c ? 3 : 0, borderColor: colors.borderStrong }}>
            {value === c ? <Icon name="check" size={18} color="staticWhite" /> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// --- Salon / mekân / plato ---------------------------------------------------

export function VenueSheet({ venue, visible, onClose, nextColor }: Base & { venue?: Venue | null; nextColor: string }) {
  const { vertical: v } = useSessionContext();
  return <BottomSheet visible={visible} title={venue ? `${v.resource.singular} düzenle` : v.resourceNew} onClose={onClose}><VenueForm venue={venue ?? null} nextColor={nextColor} onDone={onClose} /></BottomSheet>;
}
function VenueForm({ venue, nextColor, onDone }: { venue: Venue | null; nextColor: string; onDone: () => void }) {
  const { vertical: v } = useSessionContext();
  const save = useSaveVenue();
  const s = useDone(onDone, "Kaydedildi");
  const { control, handleSubmit, formState: { errors } } = useForm<VenueInput>({
    resolver: zodResolver(venueSchema) as never,
    defaultValues: { id: venue?.id, name: venue?.name ?? "", capacity: venue?.capacity ?? "", description: venue?.description ?? "", color: venue?.color ?? nextColor, is_active: venue?.is_active ?? true },
  });
  return (
    <View style={{ gap: 16 }}>
      {s.error ? <Banner reveal tone="danger" title="Kaydedilemedi" body={s.error} /> : null}
      {venue?.allows_overlap ? <Banner tone="info" title="Serbest alan" body="Bu satırda çakışma kuralı işlemez (dış mekân / diğer)." /> : null}
      <Controller control={control} name="name" render={({ field }) => <TextField label="Ad" placeholder={v.resourcePlaceholder} value={field.value} onChangeText={field.onChange} error={errors.name?.message} />} />
      <Controller control={control} name="capacity" render={({ field }) => <TextField label="Kapasite (kişi, isteğe bağlı)" keyboardType="number-pad" value={String(field.value ?? "")} onChangeText={(t) => field.onChange(t.replace(/\D/g, ""))} />} />
      <Controller control={control} name="description" render={({ field }) => <TextField label="Açıklama (isteğe bağlı)" multiline placeholder={v.resourceDescPlaceholder} value={field.value ?? ""} onChangeText={field.onChange} />} />
      <Controller control={control} name="color" render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />} />
      <Controller control={control} name="is_active" render={({ field }) => <ActiveRow value={field.value} onChange={field.onChange} label="Aktif" help="Pasif kayıt yeni rezervasyonda seçilemez; geçmiş kayıtlar korunur." />} />
      <Button label="Kaydet" loading={s.pending} onPress={handleSubmit((x) => s.run(() => save.mutateAsync(x)))} />
    </View>
  );
}

// --- Ekip --------------------------------------------------------------------

export function TeamSheet({ team, visible, onClose, nextColor }: Base & { team?: Team | null; nextColor: string }) {
  return <BottomSheet visible={visible} title={team ? "Ekibi düzenle" : "Yeni ekip"} onClose={onClose}><TeamForm team={team ?? null} nextColor={nextColor} onDone={onClose} /></BottomSheet>;
}
function TeamForm({ team, nextColor, onDone }: { team: Team | null; nextColor: string; onDone: () => void }) {
  const save = useSaveTeam();
  const s = useDone(onDone, "Kaydedildi");
  const { control, handleSubmit, formState: { errors } } = useForm<TeamInput>({
    resolver: zodResolver(teamSchema) as never,
    defaultValues: { id: team?.id, name: team?.name ?? "", members: team?.members ?? "", phone: team?.phone ?? "", note: team?.note ?? "", color: team?.color ?? nextColor, is_active: team?.is_active ?? true },
  });
  return (
    <View style={{ gap: 16 }}>
      {s.error ? <Banner reveal tone="danger" title="Kaydedilemedi" body={s.error} /> : null}
      <Controller control={control} name="name" render={({ field }) => <TextField label="Ekip adı" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />} />
      <Controller control={control} name="members" render={({ field }) => <TextField label="Ekipte kimler var (isteğe bağlı)" multiline value={field.value ?? ""} onChangeText={field.onChange} />} />
      <Controller control={control} name="phone" render={({ field }) => <TextField label="Telefon (isteğe bağlı)" keyboardType="phone-pad" value={field.value ?? ""} onChangeText={field.onChange} error={errors.phone?.message} />} />
      <Controller control={control} name="note" render={({ field }) => <TextField label="Not (isteğe bağlı)" multiline value={field.value ?? ""} onChangeText={field.onChange} />} />
      <Controller control={control} name="color" render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />} />
      <Controller control={control} name="is_active" render={({ field }) => <ActiveRow value={field.value} onChange={field.onChange} label="Aktif" help="Pasif ekip yeni çekime atanamaz; mevcut atamalar korunur." />} />
      <Button label="Kaydet" loading={s.pending} onPress={handleSubmit((x) => s.run(() => save.mutateAsync(x)))} />
    </View>
  );
}

// --- Paket -------------------------------------------------------------------

export function PackageSheet({ pkg, venues, visible, onClose }: Base & { pkg?: Package | null; venues: Venue[] }) {
  return <BottomSheet visible={visible} title={pkg ? "Paketi düzenle" : "Yeni paket"} onClose={onClose}><PackageForm pkg={pkg ?? null} venues={venues} onDone={onClose} /></BottomSheet>;
}
function PackageForm({ pkg, venues, onDone }: { pkg: Package | null; venues: Venue[]; onDone: () => void }) {
  const { colors } = useTheme();
  const { vertical: v } = useSessionContext();
  const save = useSavePackage();
  const s = useDone(onDone, "Kaydedildi");
  const [custom, setCustom] = useState("");
  const { control, handleSubmit, watch, formState: { errors } } = useForm<PackageInput>({
    resolver: zodResolver(packageSchema) as never,
    defaultValues: { id: pkg?.id, name: pkg?.name ?? "", description: pkg?.description ?? "", base_price: pkg?.base_price ?? 0, venue_id: pkg?.venue_id ?? "none", pricing_type: pkg?.pricing_type ?? "sabit", included_services: pkg?.included_services ?? [], is_active: pkg?.is_active ?? true },
  });
  const services = useFieldArray({ control, name: "included_services" as never });
  const list = (watch("included_services") ?? []) as string[];
  const pricing = watch("pricing_type");
  const add = (name: string) => { const n = name.trim(); if (n && !list.includes(n) && list.length < 30) (services as unknown as { append: (v: string) => void }).append(n); };
  return (
    <View style={{ gap: 16 }}>
      {s.error ? <Banner reveal tone="danger" title="Kaydedilemedi" body={s.error} /> : null}
      <Controller control={control} name="name" render={({ field }) => <TextField label="Paket adı" placeholder="Gold Paket" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />} />
      <Controller control={control} name="description" render={({ field }) => <TextField label="Açıklama (isteğe bağlı)" multiline value={field.value ?? ""} onChangeText={field.onChange} />} />
      {v.usesPerGuestPricing ? <Controller control={control} name="pricing_type" render={({ field }) => (
        <SegmentedControl options={enumOptions(PRICING_TYPE_LABELS).map((o) => ({ value: o.value, label: o.label }))} value={field.value} onChange={field.onChange} />
      )} /> : null}
      <Controller control={control} name="base_price" render={({ field }) => <MoneyField compact label={pricing === "kisi_basi" ? "Kişi başı fiyat" : "Fiyat"} value={Number(field.value) || 0} onChange={field.onChange} error={errors.base_price?.message as string | undefined} />} />
      {v.usesResource ? <Controller control={control} name="venue_id" render={({ field }) => (
        <SelectField label={`Geçerli ${v.resource.singular.toLocaleLowerCase("tr-TR")}`} value={field.value ?? "none"} onChange={field.onChange} options={[{ value: "none", label: `Tüm ${v.resource.plural.toLocaleLowerCase("tr-TR")}` }, ...venues.filter((x) => x.is_active && !x.allows_overlap).map((x) => ({ value: x.id, label: x.name, color: x.color }))]} />
      )} /> : null}
      <View style={{ gap: 10 }}>
        <Text variant="headline">Dahil hizmetler</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {v.packageServices.filter((x) => !list.includes(x)).map((x) => (
            <Pressable key={x} onPress={() => add(x)} accessibilityRole="button" style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.bgSurfaceSunken }}>
              <Text variant="caption" color="textSecondary">+ {x}</Text>
            </Pressable>
          ))}
        </View>
        {list.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {list.map((name, i) => (
              <View key={`${name}-${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingLeft: 12, paddingRight: 8, borderRadius: 17, backgroundColor: colors.actionSecondaryPressed }}>
                <Text variant="labelS" color="feedbackOnNeutralSubtle">{name}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${name} hizmetini kaldır`}
                  hitSlop={10}
                  onPress={() => (services as unknown as { remove: (i: number) => void }).remove(i)}
                  style={{ width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.textTertiary }}
                >
                  <Icon name="x" size={12} color="staticWhite" strokeWidth={2.5} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}><TextField label="Hizmet ekle" value={custom} onChangeText={setCustom} returnKeyType="done" onSubmitEditing={() => { add(custom); setCustom(""); }} /></View>
          <Button label="Ekle" size="L" variant="secondary" fullWidth={false} align="flex-end" onPress={() => { add(custom); setCustom(""); }} />
        </View>
      </View>
      <Controller control={control} name="is_active" render={({ field }) => <ActiveRow value={field.value} onChange={field.onChange} label="Aktif" help="Pasif paket yeni kayıtlarda seçilemez." />} />
      <Button label="Kaydet" loading={s.pending} onPress={handleSubmit((x) => s.run(() => save.mutateAsync(x)))} />
    </View>
  );
}
