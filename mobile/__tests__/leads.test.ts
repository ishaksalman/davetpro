import { istanbulISO, leadDefaults, matchCustomerByPhone, packagePrice, prepareLead, quoteShareText, isOpenLead, LEAD_TONE } from "~/lib/domain/leads";
import { vertical } from "@/lib/vertical";
import type { Quote, QuoteItem } from "@/lib/database.types";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("talepler", () => {
  test("telefonla müşteri eşleme son 10 hane (biçimden bağımsız)", () => {
    const cs = [{ phone: "0532 111 22 33", id: "a" }, { phone: "+90 555 000 11 22", id: "b" }];
    expect(matchCustomerByPhone(cs, "5321112233")?.id).toBe("a");
    expect(matchCustomerByPhone(cs, "+90 (555) 000-11-22")?.id).toBe("b");
    expect(matchCustomerByPhone(cs, "0532 111")).toBeNull();
    expect(matchCustomerByPhone(cs, "0544 999 88 77")).toBeNull();
  });
  test("durum sınıfı ve açık talep", () => {
    expect(isOpenLead("yeni")).toBe(true);
    expect(isOpenLead("kazanildi")).toBe(false);
    expect(LEAD_TONE.kaybedildi).toBe("neutral");
  });
  test("İstanbul damgası UTC+3", () => {
    expect(istanbulISO("2026-10-24", "18:00")).toBe("2026-10-24T18:00:00+03:00");
    expect(new Date(istanbulISO("2026-10-24", "18:00")).toISOString()).toBe("2026-10-24T15:00:00.000Z");
  });
  test("paket fiyat önerisi", () => {
    expect(packagePrice({ pricing_type: "sabit", base_price: 120000 }, 300)).toBe(120000);
    expect(packagePrice({ pricing_type: "kisi_basi", base_price: 799.99 }, 3)).toBe(2399.97);
    expect(packagePrice(undefined, 5)).toBe(0);
  });
  test("talep şeması: yeni müşteri ve saat çifti kuralı", () => {
    const d = leadDefaults({ vertical: vertical("salon"), venues: [{ id: uuid(2), is_active: true }] });
    expect(d.venue_id).toBe(uuid(2));
    const ok = prepareLead({ ...d, full_name: "Ayşe Yılmaz", phone: "0532 111 22 33" });
    expect(ok.ok).toBe(true);
    const bad = prepareLead({ ...d, full_name: "Ayşe Yılmaz", phone: "0532 111 22 33", start_time: "19:00", end_time: "" });
    expect(bad).toEqual({ ok: false, error: "Başlangıç ve bitiş saatini birlikte girin." });
    const short = prepareLead({ ...d, full_name: "A", phone: "0532 111 22 33" });
    expect(short.ok).toBe(false);
  });
  test("teklif paylaşım metni", () => {
    const q = { quote_number: "T-0007", version: 2, guest_count: 300, package_amount: 120000, discount_amount: 5000, total_amount: 121000, valid_until: "2026-11-01", notes: null, id: "q" } as Quote;
    const items = [{ quote_id: "q", name: "Drone", amount: 6000 }] as QuoteItem[];
    const t = quoteShareText({ business: "Gül Salon", customer: "Ayşe", quote: q, items, venue: "Kristal", vertical: vertical("salon") });
    expect(t).toContain("Gül Salon — Teklif T-0007 (2. sürüm)");
    expect(t).toContain("+ Drone: ₺6.000");
    expect(t).toContain("İndirim: −₺5.000");
    expect(t).toContain("Toplam: ₺121.000");
    expect(t).toContain("Geçerlilik: 01.11.2026");
  });
});
