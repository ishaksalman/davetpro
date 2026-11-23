import { paymentState, reservationBadge } from "~/lib/domain/status";
import { availabilityView, submitBlockedReason } from "~/lib/domain/availability";
import { vertical } from "@/lib/vertical";
import type { VenueAvailability } from "@/lib/database.types";

const r = (o: object = {}) => ({ status: "kesinlesti" as const, delivery_status: null, event_date: "2026-10-17", start_time: "19:00:00", end_time: "23:30:00", ...o });

describe("rozetler", () => {
  test("salon: düz durum", () => {
    expect(reservationBadge(r(), vertical("salon"))).toEqual({ label: "Oluşturuldu", tone: "success" });
    expect(reservationBadge(r({ status: "iptal_edildi" }), vertical("salon"))).toEqual({ label: "İptal edildi", tone: "danger" });
  });
  test("fotoğrafçı: tarihi geçen iş 'Çekim yapıldı', teslim akışı", () => {
    const f = vertical("fotografci");
    const now = new Date("2026-10-20T10:00:00Z");
    expect(reservationBadge(r(), f, now).label).toBe("Çekim yapıldı");
    expect(reservationBadge(r({ event_date: "2026-12-01" }), f, now).label).toBe("Oluşturuldu");
    expect(reservationBadge(r({ delivery_status: "baskida" }), f, now)).toEqual({ label: "Baskıda", tone: "violet" });
    // iptal öncelikli
    expect(reservationBadge(r({ status: "iptal_edildi", delivery_status: "baskida" }), f, now).label).toBe("İptal edildi");
  });
});

describe("ödeme durumu", () => {
  const p = (net: number, col: number, due: string | null = null) => ({ net_amount: net, collected_amount: col, balance_amount: net - col, due_date: due });
  test("fiyat yoksa rozet yok", () => expect(paymentState(p(0, 0), "2026-10-11")).toBeNull());
  test("tamamı ödendi", () => expect(paymentState(p(100, 100), "2026-10-11")?.label).toBe("Tamamı ödendi"));
  test("kısmi", () => expect(paymentState(p(100, 40), "2026-10-11")).toEqual({ label: "Kısmi ödendi", tone: "warning" }));
  test("vadesi geçmiş", () => expect(paymentState(p(100, 40, "2026-10-01"), "2026-10-11")?.label).toBe("Vadesi geçti"));
  test("hiç ödeme yok: nötr (kırmızı değil)", () => expect(paymentState(p(100, 0), "2026-10-11")).toEqual({ label: "Ödeme bekliyor", tone: "neutral" }));
});

const row = (o: Partial<VenueAvailability> = {}): VenueAvailability => ({
  venue_id: "v1", venue_name: "Kristal Salon", is_available: true, conflict_kind: null, conflict_label: null, conflict_start: null,
  conflict_end: null, hold_expires_at: null, severity: null, gap_minutes: null, allows_overlap: false, ...o,
});
const args = (rows: VenueAvailability[], venue = { id: "v1", allows_overlap: false }) => ({
  rows, venue, eventDate: "2026-10-17", startTime: "19:00", endTime: "23:30", vertical: vertical("salon"),
});

describe("müsaitlik kararı", () => {
  test("serbest alanda hiçbir şey gösterilmez", () => {
    expect(availabilityView(args([row()], { id: "v1", allows_overlap: true }))).toEqual({ kind: "idle" });
  });
  test("müsait", () => expect(availabilityView(args([row()])).kind).toBe("ok"));
  test("kesin çakışma engeller", () => {
    const v = availabilityView(args([row({ is_available: false, severity: "engel", conflict_kind: "rezervasyon", conflict_label: "Ayşe & Mehmet" })]));
    expect(v.kind).toBe("block");
    expect(submitBlockedReason(v, vertical("salon"))).toBe("Seçilen salon ve saatte kesin rezervasyon var. Farklı bir tarih veya salon seçin.");
  });
  test("opsiyon engeller", () => {
    const v = availabilityView(args([row({ is_available: false, severity: "engel", conflict_kind: "opsiyon", conflict_label: "Can" })]));
    expect(v.kind === "block" && v.hold).toBe(true);
    expect(submitBlockedReason(v, vertical("salon"))).toContain("opsiyonlu");
  });
  test("bir saatlik boşluk kuralı ayrı mesaj", () => {
    const v = availabilityView(args([row({ is_available: false, severity: "engel", gap_minutes: 30, conflict_kind: "rezervasyon", conflict_label: "X" })]));
    expect(submitBlockedReason(v, vertical("salon"))).toBe("İki organizasyon arasında en az 1 saat olmalı.");
  });
  test("uyarı kaydı engellemez", () => {
    const v = availabilityView(args([row({ severity: "uyari", gap_minutes: 75, conflict_kind: "rezervasyon", conflict_label: "X" })]));
    expect(v.kind).toBe("warn");
    expect(submitBlockedReason(v, vertical("salon"))).toBeNull();
  });
  test("fotoğrafçı sözlüğü: 'çekim' kelimesi", () => {
    const f = { ...args([row({ is_available: false, severity: "engel", gap_minutes: 30, conflict_label: "X" })]), vertical: vertical("fotografci") };
    expect(submitBlockedReason(availabilityView(f), vertical("fotografci"))).toBe("İki çekim arasında en az 1 saat olmalı.");
  });
});
