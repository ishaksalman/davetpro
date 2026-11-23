/**
 * Tutar girişi (tr-TR): binlik ayraç nokta, ondalık virgül.
 *
 * Neden ayrı: web'deki `moneyField` şeması ham metni "noktaları sil, virgülü
 * noktaya çevir" ile ayrıştırıyor; "120000.5" gibi noktalı ondalık 1200005 olur.
 * Mobilde şemaya ham metin HİÇ verilmez — alan her zaman burada `number` üretir.
 * Kayan nokta toplaması yapılmaz; değer kuruşa yuvarlanır (numeric(12,2)).
 */
export const MAX_MONEY = 99_999_999.99;

/** Yazarken biçimlendirir: "1250,5" → "1.250,5". */
export function formatMoneyInput(raw: string): string {
  // Son karakter nokta ise kullanıcı ondalık ayraç yazmıştır (klavye yerel ayarı
  // virgül göstermeyebilir); biçimlendirmeden gelen noktalar önceki metinde zaten var.
  let s = raw.endsWith(".") && !raw.includes(",") ? raw.slice(0, -1) + "," : raw;
  s = s.replace(/[^\d,]/g, "");
  const comma = s.indexOf(",");
  let int = comma === -1 ? s : s.slice(0, comma);
  let dec = comma === -1 ? null : s.slice(comma + 1).replace(/,/g, "").slice(0, 2);
  int = int.replace(/^0+(?=\d)/, "");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (dec === null) return grouped;
  return `${grouped === "" ? "0" : grouped},${dec}`;
}

/** Biçimli metni sayıya çevirir. Boş / geçersiz → null. */
export function parseMoneyInput(text: string): number | null {
  const cleaned = text.trim().replace(/\./g, "").replace(",", ".");
  if (cleaned === "" || cleaned === ".") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

/** Sayıyı alana yazılacak metne çevirir (0 → boş alan). */
export function moneyToInput(value: number | null | undefined): string {
  if (!value) return "";
  const kurus = Math.round(value * 100);
  const int = Math.trunc(kurus / 100);
  const dec = Math.abs(kurus % 100);
  const grouped = String(int).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec === 0 ? grouped : `${grouped},${String(dec).padStart(2, "0")}`;
}

export function isWithinMax(n: number): boolean {
  return n <= MAX_MONEY;
}

/** "1930" → "19:30"; yalnızca rakam alır, en fazla 4 hane. */
export function formatTimeInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

/** "19:30" geçerli saat mi? */
export function isValidTime(text: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(text);
  return !!m && Number(m[1]) <= 23 && Number(m[2]) <= 59;
}
