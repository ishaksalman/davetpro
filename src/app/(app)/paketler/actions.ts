"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { packageSchema, type PackageInput } from "@/lib/schemas";
import { actionError, validationError, type ActionResult } from "@/lib/action-result";

export async function savePackage(input: PackageInput): Promise<ActionResult> {
  await requireSession();

  const parsed = packageSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const { id, ...values } = parsed.data;
  const supabase = await createClient();

  const { error } = id
    ? await supabase.from("packages").update(values).eq("id", id)
    : await supabase.from("packages").insert(values);

  if (error) return actionError(error);

  for (const p of ["/paketler", "/rezervasyonlar", "/raporlar"]) revalidatePath(p);
  return { ok: true };
}

export async function deletePackage(id: string): Promise<ActionResult> {
  await requireSession();

  const supabase = await createClient();
  const { error } = await supabase.from("packages").delete().eq("id", id);
  if (error) return actionError(error);

  for (const p of ["/paketler", "/rezervasyonlar", "/raporlar"]) revalidatePath(p);
  return { ok: true };
}
