import { useState } from "react";
import { View } from "react-native";
import { Controller } from "react-hook-form";
import { useForm } from "~/lib/use-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { INCOME_CATEGORY_LABELS, PAYMENT_METHOD_LABELS, enumOptions } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { expenseSchema, paymentSchema, voidSchema, type ExpenseInput, type PaymentInput } from "@/lib/schemas";
import { todayISO } from "@/lib/time";
import { useCreateExpense, useCreatePayment, useExpenseCategories, useVoidRecord } from "~/lib/data/finance";
import { useLinkableReservations } from "~/lib/data/finance-lists";
import { useLookups } from "~/lib/data/lookups";
import type { ReservationRow } from "~/lib/data/types";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { formatDate as fmtDate } from "@/lib/format";
import { useOnline, useSubmitGuard } from "~/lib/hooks";
import { Button } from "~/ui/Button";
import { Banner, ConfirmDialog, useToast } from "~/ui/Feedback";
import { MoneyField, SegmentedControl, TextField } from "~/ui/Inputs";
import { DateField, SelectField } from "~/ui/Pickers";
import { BottomSheet } from "~/ui/Sheet";
import { Text } from "~/ui/Text";
import { useSessionContext } from "~/lib/auth/session";

const METHODS = [
  { value: "havale_eft", label: "Havale/EFT" },
  { value: "kredi_karti", label: "Kart" },
  { value: "nakit", label: "Nakit" },
  { value: "diger", label: "Diğer" },
] as const;

const kurus = (n: number) => Math.round(n * 100);

/**
 * Tahsilat ekle. Kayıtlar DEĞİŞTİRİLEMEZ: düzenleme yok; hatalı kayıt iptal edilip
 * yenisi açılır. Tutar kalan bakiyeyi aşamaz (veritabanı trigger'ı da zorlar).
 * Hatada girdiler korunur; çift gönderim ref kilidiyle engellenir.
 */
export function PaymentSheet({ reservation, visible, onClose }: { reservation: ReservationRow | null; visible: boolean; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} title="Tahsilat ekle" onClose={onClose}>
      <PaymentForm reservation={reservation} onDone={onClose} />
    </BottomSheet>
  );
}

function PaymentForm({ reservation, onDone }: { reservation: ReservationRow | null; onDone: () => void }) {
  const toast = useToast();
  const online = useOnline();
  const guard = useSubmitGuard();
  const create = useCreatePayment();
  const [formError, setFormError] = useState<string | null>(null);
  // reservation null: genel tahsilat ekranından — rezervasyon seçilir ya da rezervasyona bağlı olmayan manuel gelir.
  const linkable = useLinkableReservations(!reservation, true);
  const lookups = useLookups();
  const [pickId, setPickId] = useState("none");
  const target = reservation ?? (linkable.data ?? []).find((r) => r.id === pickId) ?? null;
  const balance = target?.balance_amount ?? 0;
  const manual = !target;

  const { control, handleSubmit, setValue, setError, formState: { errors } } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema) as never,
    defaultValues: {
      reservation_id: reservation?.id ?? "none",
      customer_id: reservation?.customer_id ?? "none",
      amount: 0,
      payment_date: todayISO(),
      method: "nakit",
      category: reservation ? "ara_odeme" : "diger",
      description: "",
    },
  });

  const onSubmit = handleSubmit((values) =>
    guard.run(async () => {
      setFormError(null);
      const amount = Number(values.amount);
      if (target && kurus(amount) > kurus(balance)) {
        setError("amount", { message: `Kalan bakiyeyi (${formatMoney(balance)}) aşıyor.` });
        return;
      }
      const r = await create.mutateAsync(values);
      if (!r.ok) return setFormError(r.error);
      toast({ tone: "success", message: "Tahsilat kaydedildi" });
      onDone();
    }),
  );

  return (
    <View style={{ gap: 16 }}>
      {!online ? <Banner tone="offline" title="Çevrimdışısınız" body="Çift kayıt olmaması için finansal kayıt yalnızca bağlantı varken eklenir." /> : null}
      {formError ? <Banner reveal tone="danger" title="Kaydedilemedi" body={formError} /> : null}
      {!reservation ? (
        <View style={{ gap: 12 }}>
          <SelectField
            label="Bağlı rezervasyon" value={pickId}
            options={[
              { value: "none", label: "Bağlı değil (manuel gelir)" },
              ...(linkable.data ?? []).map((r) => ({ value: r.id, label: `${r.customer?.full_name ?? "—"} · ${fmtDate(r.event_date)}`, hint: `${ORGANIZATION_TYPE_LABELS[r.organization_type]} · kalan ${formatMoney(r.balance_amount)}` })),
            ]}
            onChange={(id) => {
              setPickId(id);
              const r = (linkable.data ?? []).find((x) => x.id === id);
              setValue("reservation_id", r?.id ?? "none");
              setValue("customer_id", r?.customer_id ?? "none");
              setValue("category", r ? "ara_odeme" : "diger");
            }}
            searchPlaceholder="Müşteri ara…"
          />
          {linkable.isError ? <Banner tone="danger" title="Rezervasyonlar yüklenemedi" body="Yine de manuel gelir ekleyebilirsiniz." /> : null}
          {manual ? (
            <Controller control={control} name="customer_id" render={({ field }) => (
              <SelectField label="Müşteri (isteğe bağlı)" value={field.value && field.value !== "none" ? field.value : "none"} onChange={field.onChange}
                options={[{ value: "none", label: "Belirtilmedi" }, ...(lookups.data?.customers ?? []).map((c) => ({ value: c.id, label: c.full_name }))]} searchPlaceholder="Müşteri ara…" />
            )} />
          ) : null}
        </View>
      ) : null}
      <Controller control={control} name="amount" render={({ field }) => (
        <View style={{ gap: 4 }}>
          <MoneyField value={Number(field.value) || 0} onChange={field.onChange} autoFocus error={errors.amount?.message}
            hint={manual ? "Rezervasyona bağlı olmayan gelir" : balance > 0 ? `Kalan bakiye ${formatMoney(balance)}` : "Bu rezervasyonun bakiyesi kalmadı"} />
          {balance > 0 ? <Button label={`Kalanı yaz (${formatMoney(balance)})`} variant="ghost" size="S" fullWidth={false} onPress={() => setValue("amount", balance, { shouldDirty: true, shouldValidate: true })} /> : null}
        </View>
      )} />
      <View style={{ gap: 8 }}>
        <Text variant="footnoteMedium" color="textSecondary">Ödeme yöntemi</Text>
        <Controller control={control} name="method" render={({ field }) => (
          <SegmentedControl options={METHODS.map((m) => ({ value: m.value, label: m.label }))} value={field.value} onChange={field.onChange} />
        )} />
      </View>
      <Controller control={control} name="category" render={({ field }) => (
        <SelectField label="Kategori" value={field.value} options={enumOptions(INCOME_CATEGORY_LABELS)} onChange={field.onChange} error={errors.category?.message} />
      )} />
      <Controller control={control} name="payment_date" render={({ field }) => (
        <DateField label="Tarih" value={field.value} onChange={(v) => field.onChange(v ?? todayISO())} error={errors.payment_date?.message} />
      )} />
      <Controller control={control} name="description" render={({ field }) => (
        <TextField label="Açıklama (isteğe bağlı)" value={field.value ?? ""} onChangeText={field.onChange} error={errors.description?.message} />
      )} />
      <Button label="Tahsilatı kaydet" loading={guard.pending} disabled={!online || (!!target && balance <= 0)} onPress={() => { void onSubmit(); }} />
    </View>
  );
}

/** Gider ekle (organizasyona bağlı → kârlılığa yansır). Aynı değiştirilemezlik ve çift gönderim kuralları. */
export function ExpenseSheet({ reservation, visible, onClose }: { reservation: ReservationRow | null; visible: boolean; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} title="Gider ekle" onClose={onClose}>
      <ExpenseForm reservation={reservation} onDone={onClose} />
    </BottomSheet>
  );
}

function ExpenseForm({ reservation, onDone }: { reservation: ReservationRow | null; onDone: () => void }) {
  const toast = useToast();
  const online = useOnline();
  const guard = useSubmitGuard();
  const create = useCreateExpense();
  const { vertical: v } = useSessionContext();
  const cats = useExpenseCategories(true);
  const linkable = useLinkableReservations(!reservation, false);
  const [linkPick, setLinkPick] = useState("none");
  const [formError, setFormError] = useState<string | null>(null);
  const active = (cats.data ?? []).filter((c) => c.is_active);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema) as never,
    defaultValues: { category_id: "", reservation_id: reservation?.id ?? "none", amount: 0, expense_date: todayISO(), method: "nakit", description: "", vendor: "" },
  });

  const onSubmit = handleSubmit((values) =>
    guard.run(async () => {
      setFormError(null);
      const r = await create.mutateAsync(values);
      if (!r.ok) return setFormError(r.error);
      toast({ tone: "success", message: "Gider kaydedildi" });
      onDone();
    }),
  );

  if (cats.isError) return <Banner tone="danger" title="Kategoriler yüklenemedi" body={cats.error instanceof Error ? cats.error.message : undefined} />;

  return (
    <View style={{ gap: 16 }}>
      <Text variant="subhead" color="textSecondary">{reservation ? `Gideri bir ${v.event.dative} bağlarsanız o ${v.event.genitive} kârlılığına yansır.` : "Genel gider: bir rezervasyona bağlı değil; nakit akışına yansır."}</Text>
      {!online ? <Banner tone="offline" title="Çevrimdışısınız" body="Finansal kayıt yalnızca bağlantı varken eklenir." /> : null}
      {formError ? <Banner reveal tone="danger" title="Kaydedilemedi" body={formError} /> : null}
      {!reservation ? (
        <SelectField
          label="Bağlı rezervasyon (isteğe bağlı)" value={linkPick}
          options={[
            { value: "none", label: "Bağlı değil (genel gider)" },
            ...(linkable.data ?? []).map((r) => ({ value: r.id, label: `${r.customer?.full_name ?? "—"} · ${fmtDate(r.event_date)}`, hint: ORGANIZATION_TYPE_LABELS[r.organization_type] })),
          ]}
          onChange={(id) => { setLinkPick(id); setValue("reservation_id", id); }}
          searchPlaceholder="Müşteri ara…"
        />
      ) : null}
      <Controller control={control} name="amount" render={({ field }) => <MoneyField value={Number(field.value) || 0} onChange={field.onChange} error={errors.amount?.message} />} />
      <Controller control={control} name="category_id" render={({ field }) => (
        <SelectField label="Kategori" value={field.value || null} options={active.map((c) => ({ value: c.id, label: c.name }))} onChange={field.onChange} error={errors.category_id?.message} emptyText="Önce web'den gider kategorisi ekleyin." />
      )} />
      <Controller control={control} name="method" render={({ field }) => (
        <SelectField label="Ödeme yöntemi" value={field.value} options={enumOptions(PAYMENT_METHOD_LABELS)} onChange={field.onChange} />
      )} />
      <Controller control={control} name="expense_date" render={({ field }) => <DateField label="Tarih" value={field.value} onChange={(x) => field.onChange(x ?? todayISO())} error={errors.expense_date?.message} />} />
      <Controller control={control} name="vendor" render={({ field }) => <TextField label="Tedarikçi (isteğe bağlı)" value={field.value ?? ""} onChangeText={field.onChange} error={errors.vendor?.message} />} />
      <Controller control={control} name="description" render={({ field }) => <TextField label="Açıklama (isteğe bağlı)" placeholder={v.expenseNotePlaceholder} value={field.value ?? ""} onChangeText={field.onChange} error={errors.description?.message} />} />
      <Button label="Gideri kaydet" loading={guard.pending} disabled={!online || cats.isLoading} onPress={() => { void onSubmit(); }} />
    </View>
  );
}

/** Tahsilat/gider iptali: silme yok; neden zorunlu (en az 3 karakter, web ile aynı). */
export function VoidDialog({
  kind, id, visible, onClose,
}: { kind: "payments" | "expenses"; id: string | null; visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const guard = useSubmitGuard();
  const voidRecord = useVoidRecord(kind);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const label = kind === "payments" ? "Tahsilat" : "Gider";

  const close = () => { setReason(""); setError(null); onClose(); };
  const confirm = () =>
    guard.run(async () => {
      setError(null);
      const parsed = voidSchema.safeParse({ id: id ?? "", reason });
      if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Geçersiz veri.");
      const r = await voidRecord.mutateAsync({ id: parsed.data.id, reason: parsed.data.reason });
      if (!r.ok) return setError(r.error);
      toast({ tone: "success", message: `${label} iptal edildi` });
      close();
    });

  return (
    <ConfirmDialog
      visible={visible}
      destructive
      title={`${label} iptal edilsin mi?`}
      message="Kayıt silinmez; iptal nedeniyle birlikte saklanır ve raporlardan düşülür."
      confirmLabel="İptal et"
      loading={guard.pending}
      onConfirm={confirm}
      onCancel={close}
    >
      <TextField label="İptal nedeni" value={reason} onChangeText={setReason} error={error} placeholder="Örn. mükerrer kayıt" />
    </ConfirmDialog>
  );
}
