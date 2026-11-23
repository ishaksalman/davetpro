import { perGuestTotal, prepareReservation, pricingTotals } from "~/lib/domain/reservation-payload";
import { reservationDefaults, reservationResolver, selectablePackages } from "~/lib/domain/reservation-form";
import { vertical } from "@/lib/vertical";
import type { ReservationInput } from "@/lib/schemas";
import type { Venue, Package } from "@/lib/database.types";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const base: ReservationInput = {
  customer_id: uuid(1), venue_id: uuid(2), package_id: "none", organization_type: "dugun", status: "kesinlesti",
  event_date: "2026-10-17", start_time: "19:00", end_time: "23:30", guest_count: "350", location: "", team_id: null, notes: "",
  pricing_type: "sabit", unit_price: 0, package_amount: 120000, items: [{ name: "Drone çekimi", amount: 6000 }],
  discount_amount: 1000, due_date: "2026-10-17", deposit_amount: 25000,
};

describe("rezervasyon yükü (web saveReservation ile aynı)", () => {
  test("finans yetkisi varken RPC argümanları ve kapora", () => {
    const r = prepareReservation(base, true);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.deposit).toBe(25000);
    expect(r.args).toMatchObject({
      p_id: null, p_package_id: null, p_gross_amount: 120000, p_discount_amount: 1000, p_unit_price: null,
      p_items: [{ name: "Drone çekimi", amount: 6000 }], p_guest_count: 350, p_notes: null, p_location: null,
    });
  });
  test("kişi başı fiyatta birim fiyat gider", () => {
    const r = prepareReservation({ ...base, pricing_type: "kisi_basi", unit_price: 800, package_amount: 280000 }, true);
    expect(r.ok && r.args.p_unit_price).toBe(800);
  });
  test("finans yetkisi YOKSA fiyat/kapora/kalem yazılmaz ama kayıt geçerli sayılır", () => {
    const r = prepareReservation({ ...base, package_amount: 0, items: [], deposit_amount: 5000 }, false);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.args.p_gross_amount).toBeNull();
    expect(r.args.p_items).toEqual([]);
    expect(r.args.p_due_date).toBeNull();
    expect(r.deposit).toBe(0);
  });
  test("finans yetkisiyle fiyat zorunlu", () => {
    const r = prepareReservation({ ...base, package_amount: 0, items: [], discount_amount: 0, deposit_amount: 0 }, true);
    expect(r).toEqual({ ok: false, error: "Fiyat girin." });
  });
  test("kapora net satışı aşamaz, indirim toplamı aşamaz", () => {
    expect(prepareReservation({ ...base, deposit_amount: 200000 }, true)).toEqual({ ok: false, error: "Kapora, net satış tutarından büyük olamaz." });
    expect(prepareReservation({ ...base, discount_amount: 999999 }, true)).toEqual({ ok: false, error: "İndirim, toplam fiyattan büyük olamaz." });
  });
  test("başlangıç = bitiş reddedilir", () => {
    expect(prepareReservation({ ...base, end_time: "19:00" }, true)).toEqual({ ok: false, error: "Başlangıç ve bitiş saati aynı olamaz." });
  });
  test("şema idempotent: ikinci geçiş de başarılı (CLAUDE.md kuralı)", () => {
    const first = prepareReservation(base, true);
    expect(first.ok).toBe(true);
  });
  test("kuruş toplamları float birikimi yapmaz", () => {
    expect(pricingTotals(0.1, [0.2], 0)).toEqual({ gross: 0.3, net: 0.3, extras: 0.2 });
    expect(perGuestTotal(799.99, 3)).toBe(2399.97);
    expect(pricingTotals(100, [], 500).net).toBe(0);
  });
});

const venue = (o: Partial<Venue>): Venue => ({ id: uuid(9), business_id: "b", name: "V", capacity: null, description: null, color: "#000000", is_active: true, allows_overlap: false, created_at: "", updated_at: "", ...o });

describe("form varsayılanları (web ile aynı)", () => {
  test("salon: tek salon otomatik seçilir, birden çoksa boş", () => {
    const v = vertical("salon");
    expect(reservationDefaults({ vertical: v, venues: [venue({ id: uuid(5) })] }).venue_id).toBe(uuid(5));
    expect(reservationDefaults({ vertical: v, venues: [venue({ id: uuid(5) }), venue({ id: uuid(6) })] }).venue_id).toBe("");
  });
  test("organizasyon firması: varsayılan dış mekân", () => {
    const v = vertical("organizasyon");
    const d = reservationDefaults({ vertical: v, venues: [venue({ id: uuid(5) }), venue({ id: uuid(6), allows_overlap: true })] });
    expect(d.venue_id).toBe(uuid(6));
  });
  test("fotoğrafçı: salon seçimi yok, serbest alan; varsayılan saat 13:00–15:00", () => {
    const v = vertical("fotografci");
    const d = reservationDefaults({ vertical: v, venues: [venue({ id: uuid(5) }), venue({ id: uuid(6), allows_overlap: true })] });
    expect(d.venue_id).toBe(uuid(6));
    expect([d.start_time, d.end_time, d.organization_type]).toEqual(["13:00", "15:00", "dugun_nisan"]);
  });
  test("salon varsayılanı 19:00–23:00, durum kesinlesti", () => {
    const d = reservationDefaults({ vertical: vertical("salon"), venues: [] });
    expect([d.start_time, d.end_time, d.status]).toEqual(["19:00", "23:00", "kesinlesti"]);
  });
  test("salona bağlı paket yalnızca o salonda", () => {
    const pkg = (id: string, venue_id: string | null, is_active = true) => ({ id, venue_id, is_active }) as unknown as Package;
    const list = [pkg("a", null), pkg("b", uuid(2)), pkg("c", uuid(3)), pkg("d", null, false)];
    expect(selectablePackages(list, uuid(2)).map((p) => p.id)).toEqual(["a", "b"]);
    expect(selectablePackages(list, uuid(2), "c").map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
  test("finans yetkisiz çözümleyici fiyatı zorunlu tutmaz", async () => {
    const res = await reservationResolver(false)({ ...base, package_amount: 0, items: [], discount_amount: 0, deposit_amount: 0 }, undefined, { fields: {}, shouldUseNativeValidation: false } as never);
    expect(res.errors).toEqual({});
    const res2 = await reservationResolver(true)({ ...base, package_amount: 0, items: [], discount_amount: 0, deposit_amount: 0 }, undefined, { fields: {}, shouldUseNativeValidation: false } as never);
    expect(Object.keys(res2.errors)).toContain("package_amount");
  });
});
