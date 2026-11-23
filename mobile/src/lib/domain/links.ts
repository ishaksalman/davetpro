/** Teslim bağlantısı: yalnızca https (web `setDeliveryLink` ve veritabanı CHECK ile aynı). */
export function normalizeHttpsLink(value: string): { ok: true; url: string | null } | { ok: false; error: string } {
  if (value.trim() === "") return { ok: true, url: null };
  let url: URL;
  try {
    url = new URL(value.trim());
    if (url.protocol !== "https:") throw new Error("şema");
  } catch {
    return { ok: false, error: "Geçerli bir https:// bağlantısı girin." };
  }
  const out = url.toString();
  if (out.length > 2000) return { ok: false, error: "Bağlantı çok uzun." };
  return { ok: true, url: out };
}
