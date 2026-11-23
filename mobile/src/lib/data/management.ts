import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Business, ExpenseCategory, Profile, Reservation, UserRole } from "@/lib/database.types";
import {
  businessSchema, expenseCategorySchema, packageSchema, teamSchema, venueSchema, changePasswordSchema,
  type BusinessInput, type ExpenseCategoryInput, type PackageInput, type TeamInput, type VenueInput, type ChangePasswordInput,
} from "@/lib/schemas";
import { toTurkishError } from "@/lib/errors";
import { todayISO } from "@/lib/time";
import { normalizeHttpsLink } from "../domain/links";
import { supabase } from "../supabase";
import { fetchLookups, keys } from "./lookups";
import { unwrap } from "./query-error";
import { buildReservationRows } from "./rows";
import type { ReservationFinancials, ReservationItem } from "@/lib/database.types";
import type { ReservationRow } from "./types";

type Ok = { ok: true } | { ok: false; error: string };
const bad = (m?: string): Ok => ({ ok: false, error: m ?? "Geçersiz veri." });

/** Tanım kayıtları (paket/salon/ekip): aynı şema, `id` varsa güncelle yoksa ekle (web eylemleriyle aynı). */
function useDefinitionSave<T extends { id?: string }>(table: "packages" | "venues" | "teams", schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: unknown): Promise<Ok> => {
      const parsed = schema.safeParse(input);
      if (!parsed.success) return bad(parsed.error.issues[0]?.message);
      const { id, ...values } = parsed.data as T & Record<string, unknown>;
      const { error } = id ? await supabase.from(table).update(values).eq("id", id) : await supabase.from(table).insert(values);
      if (error) return bad(toTurkishError(error));
      qc.invalidateQueries({ queryKey: keys.lookups });
      qc.invalidateQueries({ queryKey: keys.reservations });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      return { ok: true };
    },
  });
}
export const useSavePackage = () => useDefinitionSave<PackageInput & { id?: string }>("packages", packageSchema as never);
export const useSaveVenue = () => useDefinitionSave<VenueInput & { id?: string }>("venues", venueSchema as never);
export const useSaveTeam = () => useDefinitionSave<TeamInput & { id?: string }>("teams", teamSchema as never);

export function useSaveBusiness(businessId: string, reload: () => Promise<void>) {
  return useMutation({
    mutationFn: async (input: BusinessInput): Promise<Ok> => {
      const parsed = businessSchema.safeParse(input);
      if (!parsed.success) return bad(parsed.error.issues[0]?.message);
      const { error } = await supabase.from("businesses").update(parsed.data).eq("id", businessId);
      if (error) return bad(toTurkishError(error));
      await reload();
      return { ok: true };
    },
  });
}

export function useMembers2() {
  return useQuery({
    queryKey: ["members", "all"],
    queryFn: async () => unwrap(await supabase.from("profiles").select("*").order("role").order("full_name").returns<Profile[]>()),
  });
}

/** Rol / finans yetkisi / aktiflik: yazma yetkisi RLS + enforce_profile_guard trigger'ında (web ile aynı). */
export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { id: string; role: UserRole; can_view_finance: boolean; is_active: boolean }): Promise<Ok> => {
      const { error } = await supabase.from("profiles").update({ role: a.role, can_view_finance: a.can_view_finance, is_active: a.is_active }).eq("id", a.id);
      if (error) return bad(toTurkishError(error));
      qc.invalidateQueries({ queryKey: ["members"] });
      return { ok: true };
    },
  });
}

export function useManageCategories(enabled: boolean) {
  return useQuery({
    queryKey: ["expense-categories", "all"],
    enabled,
    queryFn: async () => unwrap(await supabase.from("expense_categories").select("*").order("is_active", { ascending: false }).order("name").returns<ExpenseCategory[]>()),
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExpenseCategoryInput): Promise<Ok> => {
      const parsed = expenseCategorySchema.safeParse(input);
      if (!parsed.success) return bad(parsed.error.issues[0]?.message);
      const { id, ...values } = parsed.data;
      const { error } = id ? await supabase.from("expense_categories").update(values).eq("id", id) : await supabase.from("expense_categories").insert(values);
      if (error) return bad(toTurkishError(error));
      qc.invalidateQueries({ queryKey: keys.expenseCategories });
      qc.invalidateQueries({ queryKey: ["expense-categories"] });
      return { ok: true };
    },
  });
}

/** Şifre değiştirme: mevcut şifre ÖNCE doğrulanır (web changePasswordAction ile aynı; açık bırakılmış cihazda hesap ele geçirilmesin). */
export function useChangePassword(email: string | null) {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput): Promise<Ok> => {
      if (!email) return bad("Hesabınıza bağlı bir e-posta adresi yok.");
      const parsed = changePasswordSchema.safeParse(input);
      if (!parsed.success) return bad(parsed.error.issues[0]?.message);
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password: parsed.data.currentPassword });
      if (signErr) return bad("Mevcut şifreniz hatalı.");
      const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (error) return bad(toTurkishError(error));
      return { ok: true };
    },
  });
}

// --- Teslimat ----------------------------------------------------------------

/**
 * Teslimat kuyruğu: tarihi geçmiş VEYA teslim durumu elle işaretlenmiş işler
 * (web `deliveryQueueOn`); iptal ve teslim edilenler hariç. Yeniden eskiye.
 */
export function useDeliveryQueue(enabled: boolean) {
  return useQuery({
    queryKey: ["delivery", "queue"],
    enabled,
    queryFn: async (): Promise<ReservationRow[]> => {
      const lookups = await fetchLookups();
      const today = todayISO();
      const res = unwrap(
        await supabase.from("reservations").select("*").or(`event_date.lte.${today},delivery_status.not.is.null`)
          .neq("status", "iptal_edildi").order("event_date", { ascending: false }).limit(200).returns<Reservation[]>(),
      ).filter((r) => r.delivery_status !== "teslim_edildi");
      const ids = res.map((r) => r.id);
      const fin = ids.length ? unwrap(await supabase.from("reservation_financials").select("*").in("reservation_id", ids).returns<ReservationFinancials[]>()) : [];
      const items = ids.length ? unwrap(await supabase.from("reservation_items").select("*").in("reservation_id", ids).returns<ReservationItem[]>()) : [];
      return buildReservationRows(res, fin, items, lookups);
    },
  });
}

export function useDeliveryFields(id: string) {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: ["delivery"] });
    qc.invalidateQueries({ queryKey: keys.reservations });
    qc.invalidateQueries({ queryKey: keys.reservation(id) });
  };
  const dueDate = useMutation({
    mutationFn: async (date: string | null): Promise<Ok> => {
      if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad("Geçersiz tarih.");
      const { error } = await supabase.from("reservations").update({ delivery_due_date: date }).eq("id", id);
      if (error) return bad(toTurkishError(error));
      done();
      return { ok: true };
    },
  });
  /** Yalnızca https (veritabanı da CHECK ile zorlar). */
  const link = useMutation({
    mutationFn: async (value: string | null): Promise<Ok> => {
      const n = normalizeHttpsLink(value ?? "");
      if (!n.ok) return bad(n.error);
      const temiz = n.url;
      const { error } = await supabase.from("reservations").update({ delivery_link: temiz }).eq("id", id);
      if (error) return bad(toTurkishError(error));
      done();
      return { ok: true };
    },
  });
  return { dueDate, link };
}

export type { Business };
