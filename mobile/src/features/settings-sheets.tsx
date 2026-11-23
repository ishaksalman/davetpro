import { useState } from "react";
import { View } from "react-native";
import { Controller } from "react-hook-form";
import { useForm } from "~/lib/use-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { businessSchema, changePasswordSchema, expenseCategorySchema, type BusinessInput, type ChangePasswordInput, type ExpenseCategoryInput } from "@/lib/schemas";
import type { Business, ExpenseCategory, Profile } from "@/lib/database.types";
import { useAppSession, useSessionContext } from "~/lib/auth/session";
import { useChangePassword, useSaveBusiness, useSaveCategory, useUpdateMember } from "~/lib/data/management";
import { useCancelInvite, useInviteMember } from "~/lib/data/team";
import { inviteSchema, type InviteInput } from "@/lib/team-invites";
import { ConfirmDialog } from "~/ui/Feedback";
import { useSubmitGuard } from "~/lib/hooks";
import { Banner, useToast } from "~/ui/Feedback";
import { Button } from "~/ui/Button";
import { SegmentedControl, Switch, TextField } from "~/ui/Inputs";
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

const Row = ({ label, help, value, onChange }: { label: string; help: string; value: boolean; onChange: (v: boolean) => void }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
    <View style={{ flex: 1, gap: 2 }}><Text variant="bodyMedium">{label}</Text><Text variant="footnote" color="textSecondary">{help}</Text></View>
    <Switch value={value} onValueChange={onChange} label={label} />
  </View>
);

// --- İşletme bilgileri ---------------------------------------------------------

export function BusinessSheet({ business, visible, onClose }: Base & { business: Business }) {
  return <BottomSheet visible={visible} title="İşletme bilgileri" onClose={onClose}><BusinessForm business={business} onDone={onClose} /></BottomSheet>;
}
function BusinessForm({ business, onDone }: { business: Business; onDone: () => void }) {
  const { vertical: v, reload } = useSessionContext();
  const save = useSaveBusiness(business.id, reload);
  const s = useDone(onDone, "İşletme bilgileri kaydedildi");
  // Tüm alanlar mevcut değerle gelir: şema boşları null'a çevirdiği için eksik bırakılan alan (ör. logo) silinirdi.
  const { control, handleSubmit, formState: { errors } } = useForm<BusinessInput>({
    resolver: zodResolver(businessSchema) as never,
    defaultValues: {
      name: business.name, authorized_person: business.authorized_person ?? "", email: business.email ?? "", address: business.address ?? "",
      tax_office: business.tax_office ?? "", tax_number: business.tax_number ?? "", logo_url: business.logo_url ?? "", phone: business.phone ?? "",
      city: business.city ?? "", concurrent_capacity: business.concurrent_capacity ?? "",
    },
  });
  const f = (name: keyof BusinessInput, label: string, extra: object = {}, helper?: string) => (
    <Controller control={control} name={name} render={({ field }) => (
      <TextField label={label} helper={helper} value={String(field.value ?? "")} onChangeText={field.onChange} error={errors[name]?.message as string | undefined} {...extra} />
    )} />
  );
  return (
    <View style={{ gap: 16 }}>
      {s.error ? <Banner reveal tone="danger" title="Kaydedilemedi" body={s.error} /> : null}
      {f("name", "İşletme adı", { placeholder: v.businessPlaceholder })}
      {f("authorized_person", "Yetkili kişi (sözleşmede)")}
      {f("phone", "Telefon", { keyboardType: "phone-pad" })}
      {f("email", "E-posta", { keyboardType: "email-address", autoCapitalize: "none" })}
      {f("city", "Şehir")}
      {f("address", "Adres", { multiline: true })}
      {f("tax_office", "Vergi dairesi")}
      {f("tax_number", "Vergi numarası", { keyboardType: "number-pad" })}
      {v.usesCapacity ? f("concurrent_capacity", "Eş zamanlı rezervasyon kapasitesi", { keyboardType: "number-pad" }, "Boş bırakırsanız sınırsız.") : null}
      <Button label="Kaydet" loading={s.pending} onPress={handleSubmit((x) => s.run(() => save.mutateAsync(x)))} />
    </View>
  );
}

// --- Kullanıcı ----------------------------------------------------------------

export function MemberSheet({ member, visible, onClose }: Base & { member: Profile | null }) {
  return <BottomSheet visible={visible && !!member} title={member?.full_name ?? "Kullanıcı"} onClose={onClose}>{member ? <MemberForm member={member} onDone={onClose} /> : null}</BottomSheet>;
}
function MemberForm({ member, onDone }: { member: Profile; onDone: () => void }) {
  const me = useAppSession();
  const update = useUpdateMember();
  const s = useDone(onDone, "Kullanıcı güncellendi");
  const [role, setRole] = useState(member.role);
  const [fin, setFin] = useState(member.can_view_finance);
  const [active, setActive] = useState(member.is_active);
  const isSelf = member.id === me.profile.id;
  const owner = member.role === "owner";
  return (
    <View style={{ gap: 16 }}>
      {s.error ? <Banner reveal tone="danger" title="Kaydedilemedi" body={s.error} /> : null}
      {owner || isSelf ? <Banner tone="info" title={owner ? "İşletme sahibi" : "Kendi hesabınız"} body="Kendi rolünüzü ve işletme sahibini buradan değiştiremezsiniz." /> : null}
      {!owner ? <SegmentedControl options={[{ value: "manager", label: USER_ROLE_LABELS.manager }, { value: "staff", label: USER_ROLE_LABELS.staff }]} value={role === "owner" ? "manager" : role} onChange={(r) => setRole(r)} /> : null}
      <Row label="Finansal verileri görebilir" help="Yönetici ve sahip her zaman görür; personel için bu anahtar belirler." value={role !== "staff" || fin} onChange={setFin} />
      <Row label="Aktif" help="Pasif kullanıcı giriş yapsa da işletme verilerine erişemez." value={active} onChange={setActive} />
      <Button label="Kaydet" loading={s.pending} disabled={owner || isSelf} onPress={() => s.run(() => update.mutateAsync({ id: member.id, role, can_view_finance: fin, is_active: active }))} />
    </View>
  );
}

// --- Gider kategorisi ---------------------------------------------------------

export function CategorySheet({ category, visible, onClose }: Base & { category: ExpenseCategory | null }) {
  return <BottomSheet visible={visible} title={category ? "Kategoriyi düzenle" : "Yeni kategori"} onClose={onClose}><CategoryForm category={category} onDone={onClose} /></BottomSheet>;
}
function CategoryForm({ category, onDone }: { category: ExpenseCategory | null; onDone: () => void }) {
  const save = useSaveCategory();
  const s = useDone(onDone, "Kategori kaydedildi");
  const { control, handleSubmit, formState: { errors } } = useForm<ExpenseCategoryInput>({
    resolver: zodResolver(expenseCategorySchema) as never,
    defaultValues: { id: category?.id, name: category?.name ?? "", is_active: category?.is_active ?? true },
  });
  return (
    <View style={{ gap: 16 }}>
      {s.error ? <Banner reveal tone="danger" title="Kaydedilemedi" body={s.error} /> : null}
      <Controller control={control} name="name" render={({ field }) => <TextField label="Kategori adı" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />} />
      <Controller control={control} name="is_active" render={({ field }) => <Row label="Aktif" help="Pasif kategori yeni giderde seçilemez; geçmiş giderler korunur." value={field.value ?? true} onChange={field.onChange} />} />
      <Button label="Kaydet" loading={s.pending} onPress={handleSubmit((x) => s.run(() => save.mutateAsync(x)))} />
    </View>
  );
}

// --- Şifre --------------------------------------------------------------------

export function PasswordSheet({ visible, onClose }: Base) {
  return <BottomSheet visible={visible} title="Şifre değiştir" onClose={onClose}><PasswordForm onDone={onClose} /></BottomSheet>;
}
function PasswordForm({ onDone }: { onDone: () => void }) {
  const me = useAppSession();
  const change = useChangePassword(me.user.email);
  const s = useDone(onDone, "Şifreniz değiştirildi");
  const { control, handleSubmit, formState: { errors } } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema) as never,
    defaultValues: { currentPassword: "", password: "", passwordAgain: "" },
  });
  return (
    <View style={{ gap: 16 }}>
      {s.error ? <Banner reveal tone="danger" title="Değiştirilemedi" body={s.error} /> : null}
      <Controller control={control} name="currentPassword" render={({ field }) => <TextField label="Mevcut şifre" secureTextEntry autoCapitalize="none" value={field.value} onChangeText={field.onChange} error={errors.currentPassword?.message} />} />
      <Controller control={control} name="password" render={({ field }) => <TextField label="Yeni şifre" secureTextEntry autoCapitalize="none" textContentType="newPassword" value={field.value} onChangeText={field.onChange} error={errors.password?.message} />} />
      <Controller control={control} name="passwordAgain" render={({ field }) => <TextField label="Yeni şifre (tekrar)" secureTextEntry autoCapitalize="none" textContentType="newPassword" value={field.value} onChangeText={field.onChange} error={errors.passwordAgain?.message} />} />
      <Button label="Şifreyi değiştir" loading={s.pending} onPress={handleSubmit((x) => s.run(() => change.mutateAsync(x)))} />
    </View>
  );
}

// --- Kullanıcı daveti (sunucu uç noktası) --------------------------------------

export function InviteSheet({ visible, onClose }: Base) {
  return <BottomSheet visible={visible} title="Kullanıcı davet et" onClose={onClose}><InviteForm onDone={onClose} /></BottomSheet>;
}
function InviteForm({ onDone }: { onDone: () => void }) {
  const invite = useInviteMember();
  const s = useDone(onDone, "Davet gönderildi");
  const { control, handleSubmit, watch, formState: { errors } } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema) as never,
    defaultValues: { email: "", full_name: "", role: "staff", can_view_finance: false },
  });
  const role = watch("role");
  return (
    <View style={{ gap: 16 }}>
      <Text variant="subhead" color="textSecondary">Kişiye e-postayla bir davet gider; bağlantıdan şifresini belirleyip giriş yapar.</Text>
      {s.error ? <Banner reveal tone="danger" title="Davet gönderilemedi" body={s.error} /> : null}
      <Controller control={control} name="full_name" render={({ field }) => <TextField label="Ad soyad" icon="user" autoCapitalize="words" value={field.value} onChangeText={field.onChange} error={errors.full_name?.message} />} />
      <Controller control={control} name="email" render={({ field }) => <TextField label="E-posta" icon="mail" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={field.value} onChangeText={field.onChange} error={errors.email?.message} />} />
      <Controller control={control} name="role" render={({ field }) => (
        <SegmentedControl options={[{ value: "staff", label: USER_ROLE_LABELS.staff }, { value: "manager", label: USER_ROLE_LABELS.manager }]} value={field.value} onChange={field.onChange} />
      )} />
      {role === "staff" ? (
        <Controller control={control} name="can_view_finance" render={({ field }) => (
          <Row label="Finansal verileri görebilir" help="Kapalıysa personel tutarları, tahsilat ve giderleri hiç göremez." value={field.value} onChange={field.onChange} />
        )} />
      ) : <Text variant="footnote" color="textSecondary">Yönetici her zaman finansal verileri görür ve işletme ayarlarını yönetir.</Text>}
      <Button label="Daveti gönder" loading={s.pending} onPress={handleSubmit((x) => s.run(() => invite.mutateAsync({ ...x, can_view_finance: x.role === "staff" ? x.can_view_finance : true })))} />
    </View>
  );
}

/** Davet bekleyen üye: yalnızca daveti iptal etmek mümkün (rol/yetki henüz anlamsız). */
export function PendingInviteDialog({ member, onClose }: { member: Profile | null; onClose: () => void }) {
  const cancel = useCancelInvite();
  const toast = useToast();
  const guard = useSubmitGuard();
  return (
    <ConfirmDialog
      visible={!!member}
      destructive
      loading={guard.pending}
      title="Davet iptal edilsin mi?"
      message={`${member?.full_name ?? "Kullanıcı"} henüz giriş yapmadı. Davet iptal edilirse kayıt silinir; aynı adrese yeniden davet gönderebilirsiniz.`}
      confirmLabel="Daveti iptal et"
      onCancel={onClose}
      onConfirm={() => guard.run(async () => {
        if (!member) return;
        const r = await cancel.mutateAsync(member.id);
        toast(r.ok ? { tone: "success", message: "Davet iptal edildi" } : { tone: "danger", message: r.error });
        onClose();
      })}
    />
  );
}
