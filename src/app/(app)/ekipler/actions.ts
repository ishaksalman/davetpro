"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { teamSchema, type TeamInput } from "@/lib/schemas";
import { actionError, validationError, type ActionResult } from "@/lib/action-result";

export async function saveTeam(input: TeamInput): Promise<ActionResult> {
  await requireSession();

  const parsed = teamSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const { id, ...values } = parsed.data;
  const supabase = await createClient();

  const { error } = id
    ? await supabase.from("teams").update(values).eq("id", id)
    : await supabase.from("teams").insert(values);

  if (error) return actionError(error);

  // Ekip adı rezervasyon listesinde ve detayında da görünüyor.
  for (const p of ["/ekipler", "/rezervasyonlar", "/takvim"]) revalidatePath(p);
  return { ok: true };
}

export async function deleteTeam(id: string): Promise<ActionResult> {
  await requireSession();

  const supabase = await createClient();
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) return actionError(error);

  // Silinen ekibin atandığı çekimler duruyor, yalnızca atama düşüyor.
  for (const p of ["/ekipler", "/rezervasyonlar"]) revalidatePath(p);
  return { ok: true };
}
