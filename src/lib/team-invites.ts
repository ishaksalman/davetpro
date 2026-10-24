import { z } from "zod";

/**
 * Personel daveti iş mantığı — hem web eylemi hem mobil uç noktası için.
 *
 * Sunucu tarafı yardımcılar `admin` istemcisini PARAMETRE olarak alır (import
 * etmez): test edilebilsin diye ve servis rolü anahtarının yalnızca çağıranın
 * yöneticiliği doğrulandıktan sonra, çağıran tarafından verilmesi için.
 */

export const inviteSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta adresi girin."),
  full_name: z
    .string()
    .trim()
    .min(2, "Ad soyad en az 2 karakter olmalı.")
    .max(120, "Ad soyad çok uzun."),
  role: z.enum(["manager", "staff"]),
  can_view_finance: z.boolean(),
});
export type InviteInput = z.input<typeof inviteSchema>;

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Yalnızca kullandığımız admin yüzeyi (testte sahte nesne verilebilsin). */
export type AdminLike = {
  auth: {
    admin: {
      inviteUserByEmail: (
        email: string,
        opts: { redirectTo: string; data: Record<string, unknown> },
      ) => Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
      deleteUser: (id: string) => Promise<{ error: { message: string } | null }>;
      getUserById: (
        id: string,
      ) => Promise<{ data: { user: { last_sign_in_at?: string | null } | null }; error: { message: string } | null }>;
    };
  };
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    select: (cols: string) => {
      eq: (col: string, v: string) => {
        maybeSingle: () => Promise<{ data: { id: string; business_id: string } | null }>;
      };
    };
  };
};

const ALREADY =
  "Bu e-posta adresi zaten kayıtlı. Listede 'Davet bekliyor' görünüyorsa önce daveti iptal edip yeniden gönderin; " +
  "kişi zaten üyeyse giriş ekranındaki 'Şifremi unuttum' ile şifresini belirleyebilir.";

export async function inviteMember(args: {
  admin: AdminLike;
  businessId: string;
  businessName: string;
  appUrl: string;
  input: unknown;
}): Promise<Result> {
  const parsed = inviteSchema.safeParse(args.input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  const v = parsed.data;

  const { data, error } = await args.admin.auth.admin.inviteUserByEmail(v.email, {
    // İlk iş şifre belirlemek: giriş ekranı jetonu işlenmemiş bırakırdı.
    redirectTo: `${args.appUrl}/sifre-yenile`,
    data: { full_name: v.full_name, business_name: args.businessName },
  });
  if (error || !data.user) {
    return { ok: false, error: error?.message.includes("already been registered") ? ALREADY : (error?.message ?? "Davet gönderilemedi.") };
  }

  const { error: profileError } = await args.admin.from("profiles").insert({
    id: data.user.id,
    business_id: args.businessId,
    full_name: v.full_name,
    role: v.role,
    can_view_finance: v.can_view_finance,
  });
  if (profileError) {
    // Profil açılamadıysa davet edilen kullanıcı sahipsiz kalmasın.
    await args.admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, error: profileError.message };
  }
  return { ok: true };
}

/**
 * Daveti iptal eder: kullanıcıyı tamamen siler — yalnızca HİÇ GİRİŞ YAPMAMIŞ
 * kullanıcı için (çalışan personeli silmek "oluşturan" bilgisini koparır).
 * Kayıt çağıranın işletmesine ait olmalı: servis rolü tüm işletmeleri görür.
 */
export async function cancelInvite(args: {
  admin: AdminLike;
  businessId: string;
  callerId: string;
  profileId: string;
}): Promise<Result> {
  if (args.profileId === args.callerId) return { ok: false, error: "Kendi hesabınızı silemezsiniz." };

  const { data: hedef } = await args.admin.from("profiles").select("id, business_id").eq("id", args.profileId).maybeSingle();
  if (!hedef || hedef.business_id !== args.businessId) return { ok: false, error: "Kullanıcı bulunamadı." };

  const { data: authUser, error: authError } = await args.admin.auth.admin.getUserById(args.profileId);
  if (authError) return { ok: false, error: authError.message };
  if (authUser.user?.last_sign_in_at) {
    return {
      ok: false,
      error:
        "Bu kullanıcı sisteme giriş yapmış. Silmek yerine pasife alabilirsiniz; böylece geçmiş kayıtlarda kimin ne yaptığı görünmeye devam eder.",
    };
  }
  const { error } = await args.admin.auth.admin.deleteUser(args.profileId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Daveti kabul etmemiş (hiç giriş yapmamış) üyelerin kimlikleri. */
export async function pendingInviteIds(admin: AdminLike, memberIds: string[]): Promise<string[]> {
  const out = await Promise.all(
    memberIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      return data?.user && !data.user.last_sign_in_at ? id : null;
    }),
  );
  return out.filter((id): id is string => id !== null);
}
