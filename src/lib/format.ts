import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { APP_TIME_ZONE } from "@/lib/time";

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const currencyWithKurus = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const number = new Intl.NumberFormat("tr-TR");

/**
 * Para gösterimi: ₺120.000
 * Kuruş yalnızca sıfırdan farklıysa gösterilir; salon sahibi çoğu zaman
 * yuvarlak rakamlarla çalışır, gereksiz ",00" gürültü yaratır.
 */
export function formatMoney(value: number | string | null | undefined): string {
  const n = toNumber(value);
  return Number.isInteger(n) ? currency.format(n) : currencyWithKurus.format(n);
}

/** Grafik eksenleri için kısa gösterim: ₺120B, ₺1,2Mn */
export function formatMoneyCompact(value: number | string | null | undefined): string {
  const n = toNumber(value);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `₺${number.format(round(n / 1_000_000, 1))}Mn`;
  if (abs >= 1_000) return `₺${number.format(round(n / 1_000, 0))}B`;
  return `₺${number.format(n)}`;
}

export function formatNumber(value: number | string | null | undefined): string {
  return number.format(toNumber(value));
}

export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `%${number.format(round(toNumber(value), 1))}`;
}

/** Kuruş hassasiyetini kaybetmeden toplama (float birikimini önler). */
export function sumMoney(values: (number | string | null | undefined)[]): number {
  const kurus = values.reduce<number>(
    (acc, v) => acc + Math.round(toNumber(v) * 100),
    0,
  );
  return kurus / 100;
}

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

// --- Tarih ------------------------------------------------------------------

function asDate(value: string | Date): Date {
  return value instanceof Date ? value : parseISO(value);
}

/** 12.09.2026 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return format(asDate(value), "dd.MM.yyyy", { locale: tr });
}

/** 12 Eylül 2026 Cumartesi */
export function formatDateLong(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return format(asDate(value), "d MMMM yyyy EEEE", { locale: tr });
}

/** 12 Eyl 2026 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return format(asDate(value), "d MMM yyyy", { locale: tr });
}

/** Eylül 2026 */
export function formatMonth(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return format(asDate(value), "LLLL yyyy", { locale: tr });
}

/** 19:00 — Postgres "19:00:00" biçimini kısaltır. */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 5);
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** ISO tarih (yyyy-MM-dd) — sorgu parametreleri için. */
export function toISODate(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

// --- Telefon ----------------------------------------------------------------

/** 0532 111 22 33 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "—";
  const d = value.replace(/\D/g, "");
  const local = d.startsWith("90") && d.length === 12 ? d.slice(2) : d;
  if (local.length === 10) {
    return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8)}`;
  }
  if (local.length === 11 && local.startsWith("0")) {
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7, 9)} ${local.slice(9)}`;
  }
  return value;
}

/** wa.me için: 905321112233 */
export function toWhatsAppNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = value.replace(/\D/g, "");
  if (d.startsWith("90") && d.length === 12) return d;
  if (d.startsWith("0") && d.length === 11) return `90${d.slice(1)}`;
  if (d.length === 10) return `90${d}`;
  return d.length >= 10 ? d : null;
}

export function whatsAppLink(phone: string | null | undefined, message?: string): string | null {
  const n = toWhatsAppNumber(phone);
  if (!n) return null;
  const q = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${n}${q}`;
}

export function initials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toLocaleUpperCase("tr-TR") ?? "")
    .join("");
}
