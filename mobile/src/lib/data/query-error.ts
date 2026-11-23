import { toTurkishError } from "@/lib/errors";

/**
 * Supabase `{ data, error }` yanıtını açar. Hata varsa FIRLATIR (Türkçe mesajla):
 * sorgu hatası asla boş veri gibi gösterilmez (CLAUDE.md kuralı). Ekranlar
 * TanStack Query'nin `isError` durumunu ErrorState ile çizer.
 */
export class QueryError extends Error {}

export function unwrap<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new QueryError(toTurkishError(res.error));
  return res.data as T;
}

export function errorMessage(e: unknown): string {
  return e instanceof QueryError ? e.message : toTurkishError(e);
}
