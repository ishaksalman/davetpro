import { leadSchema, type LeadInput } from "@/lib/schemas";
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS } from "@/lib/constants";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { Customer, Lead, LeadStatus, Package, Quote, QuoteItem } from "@/lib/database.types";
import type { Vertical } from "@/lib/vertical";
import type { Tone } from "~/ui/Badge";

export const LEAD_TONE: Record<LeadStatus, Tone> = {
  yeni: "info",
  teklif_verildi: "violet",
  opsiyonlu: "warning",
  kazanildi: "success",
  kaybedildi: "neutral",
};

export const leadStatusLabel = (s: LeadStatus) => LEAD_STATUS_LABELS[s];
export { LEAD_SOURCE_LABELS };

export const isOpenLead = (s: LeadStatus) => s !== "kazanildi" && s !== "kaybedildi";

const digitsOf = (p: string) => p.replace(/\D/g, "");

/**
 * Aynı telefonla kayıtlı müşteri (web `findCustomerByPhone` ile aynı kural):
 * numara biçimi (boşluk, +90, 0 öneki) farklı olabileceği için son 10 hane.
 */
export function matchCustomerByPhone<T extends Pick<Customer, "phone">>(customers: T[], phone: string): T | null {
  const d = digitsOf(phone);
  if (d.length < 10) return null;
  const tail = d.slice(-10);
  return customers.find((c) => digitsOf(c.phone).slice(-10) === tail) ?? null;
}

export type PreparedLead = { ok: true; value: ReturnType<typeof leadSchema.parse> } | { ok: false; error: string };

export function prepareLead(input: LeadInput): PreparedLead {
  const parsed = leadSchema.safeParse(input);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
}

export function leadDefaults(a: { lead?: Lead | null; customer?: Customer | null; vertical: Vertical; venues: { id: string; is_active: boolean }[] }): LeadInput {
  const { lead, customer, vertical: v } = a;
  const active = a.venues.filter((x) => x.is_active);
  return {
    id: lead?.id,
    customer_id: lead?.customer_id ?? "none",
    full_name: customer?.full_name ?? "",
    phone: customer?.phone ?? "",
    email: "",
    organization_type: lead?.organization_type ?? v.defaultEventType,
    source: lead?.source ?? "telefon",
    venue_id: lead?.venue_id ?? (!v.usesResource ? "none" : active.length === 1 ? active[0].id : "none"),
    package_id: lead?.package_id ?? "none",
    event_date: lead?.event_date ?? "",
    start_time: lead?.start_time?.slice(0, 5) ?? "",
    end_time: lead?.end_time?.slice(0, 5) ?? "",
    guest_count: lead?.guest_count ?? "",
    assigned_to: lead?.assigned_to ?? "none",
    next_follow_up_at: lead?.next_follow_up_at ?? "",
    notes: lead?.notes ?? "",
  };
}

/** İşletme saati sabit UTC+3 (Türkiye); tarih + saat → ISO damga. */
export function istanbulISO(date: string, time: string): string {
  return `${date}T${time.length === 5 ? `${time}:00` : time}+03:00`;
}

/** Paket fiyatı önerisi: kişi başı ise × kişi sayısı, sabitse taban fiyat (kuruşa yuvarlı). */
export function packagePrice(pkg: Pick<Package, "pricing_type" | "base_price"> | undefined, guests: number): number {
  if (!pkg) return 0;
  return pkg.pricing_type === "kisi_basi" ? Math.round(pkg.base_price * guests * 100) / 100 : pkg.base_price;
}

/** Teklifi paylaşmak için düz metin (PDF sunucu gerektirir; metin Share sheet'ten gider). */
export function quoteShareText(a: { business: string; customer: string; quote: Quote; items: QuoteItem[]; venue?: string | null; vertical: Vertical }): string {
  const { quote: q } = a;
  const lines = [
    `${a.business} — Teklif ${q.quote_number}${q.version > 1 ? ` (${q.version}. sürüm)` : ""}`,
    `Sayın ${a.customer},`,
    a.venue ? `${a.vertical.resource.singular}: ${a.venue}` : "",
    q.guest_count ? `Kişi sayısı: ${formatNumber(q.guest_count)}` : "",
    `Paket: ${formatMoney(q.package_amount)}`,
    ...a.items.map((i) => `+ ${i.name}: ${formatMoney(i.amount)}`),
    q.discount_amount > 0 ? `İndirim: −${formatMoney(q.discount_amount)}` : "",
    `Toplam: ${formatMoney(q.total_amount)}`,
    q.valid_until ? `Geçerlilik: ${formatDate(q.valid_until)}` : "",
    q.notes ?? "",
  ];
  return lines.filter(Boolean).join("\n");
}
