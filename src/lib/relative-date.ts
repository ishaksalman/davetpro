import { APP_TIME_ZONE } from "@/lib/time";
import { formatDate } from "@/lib/format";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * "Bugün" / "Dün" / "Yarın" — satış ekranlarında tarih okumaktan hızlı.
 * Karşılaştırma işletme saat diliminde yapılır; sunucu UTC'de çalışıyor.
 */
export function relativeDay(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  const day = dayFormatter.format(date);
  const today = dayFormatter.format(new Date());

  if (day === today) return "Bugün";

  const diff = Math.round(
    (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
  if (diff === -1) return "Dün";
  if (diff === 1) return "Yarın";
  if (diff < 0 && diff >= -6) return `${-diff} gün önce`;
  if (diff > 0 && diff <= 6) return `${diff} gün sonra`;
  return formatDate(day);
}
