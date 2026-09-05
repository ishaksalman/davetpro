"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { customerSchema, type CustomerInput } from "@/lib/schemas";
import { actionError, validationError, type ActionResult } from "@/lib/action-result";

export async function saveCustomer(
  input: CustomerInput,
): Promise<ActionResult<{ id: string }>> {
  await requireSession();

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const { id, ...values } = parsed.data;
  const supabase = await createClient();

  const { data, error } = id
    ? await supabase.from("customers").update(values).eq("id", id).select("id").single()
    : await supabase.from("customers").insert(values).select("id").single();

  if (error) return actionError(error);

  // Müşteri adı rezervasyon, takvim, gelir listelerinde de görünüyor.
  for (const p of ["/musteriler", "/rezervasyonlar", "/takvim", "/panel", "/gelirler"]) {
    revalidatePath(p);
  }
  if (id) revalidatePath(`/musteriler/${id}`);
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  await requireSession();

  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return actionError(error);

  revalidatePath("/musteriler");
  return { ok: true };
}
