import { toTurkishError } from "@/lib/errors";

export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; error: string };

export function actionError(error: unknown): { ok: false; error: string } {
  return { ok: false, error: toTurkishError(error) };
}

/** Zod hatasını tek satırlık kullanıcı mesajına indirger. */
export function validationError(issues: { message: string }[]) {
  return { ok: false as const, error: issues[0]?.message ?? "Geçersiz veri." };
}
