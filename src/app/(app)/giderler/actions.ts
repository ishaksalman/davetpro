"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import {
  expenseCategorySchema,
  expenseSchema,
  voidSchema,
  type ExpenseCategoryInput,
  type ExpenseInput,
} from "@/lib/schemas";
import { actionError, validationError, type ActionResult } from "@/lib/action-result";

function revalidateExpenses(reservationId?: string | null) {
  revalidatePath("/giderler");
  revalidatePath("/panel");
  revalidatePath("/raporlar");
  revalidatePath("/ayarlar");
  if (reservationId) revalidatePath(`/rezervasyonlar/${reservationId}`);
}

/** Gider kaydı oluşturur. Tahsilatlar gibi giderler de değiştirilemez. */
export async function createExpense(input: ExpenseInput): Promise<ActionResult> {
  await requireSession();

  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert(parsed.data);
  if (error) return actionError(error);

  revalidateExpenses(parsed.data.reservation_id);
  return { ok: true };
}

export async function voidExpense(id: string, reason: string): Promise<ActionResult> {
  await requireSession();

  const parsed = voidSchema.safeParse({ id, reason });
  if (!parsed.success) return validationError(parsed.error.issues);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .update({ voided_at: new Date().toISOString(), void_reason: parsed.data.reason })
    .eq("id", parsed.data.id)
    .select("reservation_id")
    .single();

  if (error) return actionError(error);

  revalidateExpenses((data as { reservation_id: string | null }).reservation_id);
  return { ok: true };
}

// --- Gider kategorileri ------------------------------------------------------

export async function saveExpenseCategory(
  input: ExpenseCategoryInput,
): Promise<ActionResult> {
  await requireSession();

  const parsed = expenseCategorySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const { id, ...values } = parsed.data;
  const supabase = await createClient();

  const { error } = id
    ? await supabase.from("expense_categories").update(values).eq("id", id)
    : await supabase.from("expense_categories").insert(values);

  if (error) return actionError(error);

  revalidateExpenses();
  return { ok: true };
}

export async function deleteExpenseCategory(id: string): Promise<ActionResult> {
  await requireSession();

  const supabase = await createClient();
  const { error } = await supabase.from("expense_categories").delete().eq("id", id);
  if (error) return actionError(error);

  revalidateExpenses();
  return { ok: true };
}
