import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toTurkishError } from "@/lib/errors";
import { inviteSchema, type InviteInput } from "@/lib/team-invites";
import { env } from "../env";
import { supabase } from "../supabase";

type Ok = { ok: true } | { ok: false; error: string };

/**
 * Personel daveti SUNUCUDA yapılır (service_role gerekir; mobil uygulamaya konmaz).
 * İstek, kullanıcının Supabase erişim jetonuyla web uygulamasındaki
 * `/api/mobile/team` uç noktasına gider; yönetici doğrulamasını sunucu yapar.
 */
async function call(method: "GET" | "POST" | "DELETE", body?: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  if (!env.appUrl) throw new Error("Sunucu adresi (EXPO_PUBLIC_APP_URL) tanımlı değil.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Oturum bulunamadı. Yeniden giriş yapın.");
  const res = await fetch(`${env.appUrl}/api/mobile/team`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: Record<string, unknown> = {};
  try { json = await res.json(); } catch { /* gövde yok */ }
  return { status: res.status, json };
}

const fail = (e: unknown): Ok => ({ ok: false, error: toTurkishError(e) });

/** Davet bekleyen üyeler (hiç giriş yapmamış). Yalnızca yönetici çağırır. */
export function usePendingInvites(enabled: boolean) {
  return useQuery({
    queryKey: ["members", "pending"],
    enabled,
    queryFn: async (): Promise<Set<string>> => {
      const { status, json } = await call("GET");
      if (status !== 200 || !Array.isArray(json.pending)) throw new Error(typeof json.error === "string" ? json.error : "Bekleyen davetler alınamadı.");
      return new Set(json.pending as string[]);
    },
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InviteInput): Promise<Ok> => {
      const parsed = inviteSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
      try {
        const { status, json } = await call("POST", parsed.data);
        if (status === 200 && json.ok === true) {
          qc.invalidateQueries({ queryKey: ["members"] });
          return { ok: true };
        }
        return { ok: false, error: typeof json.error === "string" ? json.error : "Davet gönderilemedi." };
      } catch (e) {
        // Ağ hatasında davet gitmiş olabilir: listeyi tazele, kullanıcıya belirsizliği söyle.
        qc.invalidateQueries({ queryKey: ["members"] });
        return fail(e);
      }
    },
  });
}

export function useCancelInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string): Promise<Ok> => {
      try {
        const { status, json } = await call("DELETE", { profileId });
        if (status === 200 && json.ok === true) {
          qc.invalidateQueries({ queryKey: ["members"] });
          return { ok: true };
        }
        return { ok: false, error: typeof json.error === "string" ? json.error : "Davet iptal edilemedi." };
      } catch (e) {
        return fail(e);
      }
    },
  });
}
