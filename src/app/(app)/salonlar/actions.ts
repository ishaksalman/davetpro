"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { venueSchema, type VenueInput } from "@/lib/schemas";
import { actionError, validationError, type ActionResult } from "@/lib/action-result";

export async function saveVenue(input: VenueInput): Promise<ActionResult> {
  await requireSession();

  const parsed = venueSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const { id, ...values } = parsed.data;
  const supabase = await createClient();

  const { error } = id
    ? await supabase.from("venues").update(values).eq("id", id)
    : await supabase.from("venues").insert(values);

  if (error) return actionError(error);

  // Salon adı/rengi rezervasyon listesinde ve panelde de görünüyor.
  for (const p of ["/salonlar", "/takvim", "/rezervasyonlar", "/panel", "/raporlar"]) {
    revalidatePath(p);
  }
  return { ok: true };
}

export async function deleteVenue(id: string): Promise<ActionResult> {
  await requireSession();

  const supabase = await createClient();
  const { error } = await supabase.from("venues").delete().eq("id", id);
  if (error) return actionError(error);

  revalidatePath("/salonlar");
  return { ok: true };
}
