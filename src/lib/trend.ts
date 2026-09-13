/**
 * İki dönemin kıyası — "geçen aya göre %15 artış" gibi.
 *
 * Kıyas ancak geçen ay GERÇEKTEN bir değer varsa yapılabiliyor:
 * sıfırdan bir sayıya çıkışın yüzdesi tanımsızdır. Böyle durumlarda uydurma
 * bir oran (%100 artış gibi) göstermek yerine null dönüyoruz; çağıran taraf
 * o zaman açıklayıcı metnini yazıyor.
 */
export type Trend = {
  /** Yüzde fark; tam sayıya yuvarlanmış, mutlak değer. */
  percent: number;
  direction: "up" | "down" | "flat";
  /** "Geçen aya göre %15 artış" */
  label: string;
};

export function monthOverMonth(
  current: number | string | null | undefined,
  previous: number | string | null | undefined,
): Trend | null {
  const now = Number(current ?? 0);
  const before = Number(previous ?? 0);

  if (!Number.isFinite(now) || !Number.isFinite(before)) return null;
  // Geçen ay sıfırsa oran hesaplanamaz.
  if (before <= 0) return null;

  const fark = ((now - before) / before) * 100;
  const yuzde = Math.round(Math.abs(fark));

  // Yuvarlandığında sıfıra düşen fark "değişim yok" demektir; %0 artış
  // yazmak yanıltıcı olurdu.
  if (yuzde === 0) return { percent: 0, direction: "flat", label: "Geçen ayla aynı" };

  const direction = fark > 0 ? "up" : "down";
  return {
    percent: yuzde,
    direction,
    label: `Geçen aya göre %${yuzde} ${direction === "up" ? "artış" : "azalış"}`,
  };
}
