import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Expense, ExpenseCategory, Payment } from "@/lib/database.types";
import { expenseSchema, paymentSchema, voidSchema, type ExpenseInput, type PaymentInput } from "@/lib/schemas";
import { toTurkishError } from "@/lib/errors";
import { supabase } from "../supabase";
import { keys } from "./lookups";
import { QueryError, unwrap } from "./query-error";

export function usePayments(reservationId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["finance", "payments", reservationId],
    enabled,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("payments").select("*").eq("reservation_id", reservationId)
          .order("payment_date", { ascending: true }).order("created_at", { ascending: true })
          .returns<Payment[]>(),
      ),
  });
}

export function useExpenses(reservationId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["finance", "expenses", reservationId],
    enabled,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("expenses").select("*").eq("reservation_id", reservationId)
          .order("expense_date", { ascending: true }).returns<Expense[]>(),
      ),
  });
}

export function useExpenseCategories(enabled: boolean) {
  return useQuery({
    queryKey: keys.expenseCategories,
    enabled,
    staleTime: 60_000,
    queryFn: async () => unwrap(await supabase.from("expense_categories").select("*").order("name").returns<ExpenseCategory[]>()),
  });
}

function useInvalidateFinance() {
  const qc = useQueryClient();
  return (reservationId?: string | null) => {
    qc.invalidateQueries({ queryKey: ["finance"] });
    qc.invalidateQueries({ queryKey: keys.reservations });
    qc.invalidateQueries({ queryKey: keys.dashboard });
    if (reservationId) qc.invalidateQueries({ queryKey: keys.reservation(reservationId) });
  };
}

export type ActionResult = { ok: true } | { ok: false; error: string; maybeSaved?: boolean };

/** Ağ/zaman aşımı: işlem sunucuda tamamlanmış olabilir → çağıran listeyi tazeleyip uyarır. */
function isUncertain(err: { message?: string; code?: string }): boolean {
  return /fetch|network|timeout|gateway|abort|ECONN/i.test(err.message ?? "") || err.code === "57014";
}

/**
 * Tahsilat kaydı. Güncelleme/silme YOK (değiştirilemez kayıt): hatalı kayıt
 * iptal edilip yenisi açılır. Çift gönderim ekranda `useSubmitGuard` ile engellenir.
 */
export function useCreatePayment() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: async (input: PaymentInput): Promise<ActionResult> => {
      const parsed = paymentSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
      const { error } = await supabase.from("payments").insert(parsed.data);
      if (error) {
        const uncertain = isUncertain(error);
        if (uncertain) invalidate(parsed.data.reservation_id);
        return { ok: false, error: toTurkishError(error), maybeSaved: uncertain };
      }
      invalidate(parsed.data.reservation_id);
      return { ok: true };
    },
  });
}

export function useCreateExpense() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: async (input: ExpenseInput): Promise<ActionResult> => {
      const parsed = expenseSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
      const { error } = await supabase.from("expenses").insert(parsed.data);
      if (error) {
        const uncertain = isUncertain(error);
        if (uncertain) invalidate(parsed.data.reservation_id);
        return { ok: false, error: toTurkishError(error), maybeSaved: uncertain };
      }
      invalidate(parsed.data.reservation_id);
      return { ok: true };
    },
  });
}

/** İptal (silme değil): `voided_at` + `void_reason`. Tutar/bağlantı değişmez. */
export function useVoidRecord(kind: "payments" | "expenses") {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }): Promise<ActionResult> => {
      const parsed = voidSchema.safeParse({ id, reason });
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
      const { data, error } = await supabase
        .from(kind)
        .update({ voided_at: new Date().toISOString(), void_reason: parsed.data.reason })
        .eq("id", parsed.data.id)
        .select("reservation_id")
        .single();
      if (error) return { ok: false, error: toTurkishError(error) };
      invalidate((data as { reservation_id: string | null }).reservation_id);
      return { ok: true };
    },
  });
}

export { QueryError };
