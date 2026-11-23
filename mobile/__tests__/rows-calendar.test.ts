import { buildReservationRows, collectedPercent } from "~/lib/data/rows";
import { matchSearch } from "~/lib/data/reservations";
import { monthGrid, shiftMonth, monthRange } from "~/lib/domain/calendar";
import { dateBlock, greeting, greetingDate } from "~/features/format-helpers";
import type { Customer, Reservation, ReservationFinancials, ReservationItem, Venue, Package, Team } from "@/lib/database.types";
import type { Lookups } from "~/lib/data/types";

jest.mock("~/lib/supabase", () => ({ supabase: {} }));

const lookups: Lookups = {
  customers: [
    { id: "c1", full_name: "Ayşe & Mehmet", phone: "0532 111 22 33" } as Customer,
    { id: "c2", full_name: "Selin & Arda", phone: "0555 000 11 22" } as Customer,
  ],
  venues: [{ id: "v1", name: "Kristal Salon", color: "#6366f1" } as Venue], packages: [{ id: "p1", name: "Gold", included_services: ["Yemek"] } as Package], teams: [] as Team[],
};
const res = { id: "r1", business_id: "b", customer_id: "c1", venue_id: "v1", package_id: "p1", team_id: null, event_date: "2026-10-17", created_at: "", updated_at: "" } as Reservation;
const fin = { reservation_id: "r1", net_amount: 120000, collected_amount: 70000, balance_amount: 50000, expense_amount: 0, profit_amount: 120000, profit_margin: null, due_date: "2026-11-15", unit_price: null, package_amount: 120000, extras_amount: 0, gross_amount: 120000, discount_amount: 0 } as ReservationFinancials;

describe("satır birleştirme", () => {
  test("finans view + kalem + adlar", () => {
    const [row] = buildReservationRows([res], [fin], [{ id: "i1", reservation_id: "r1", name: "Drone", amount: 6000 } as ReservationItem], lookups);
    expect(row.customer?.full_name).toBe("Ayşe & Mehmet");
    expect(row.venue?.color).toBe("#6366f1");
    expect(row.balance_amount).toBe(50000);
    expect(row.items).toHaveLength(1);
    expect(row.package?.included_services).toEqual(["Yemek"]);
  });
  test("finans yetkisi yok: view boş küme → tutarlar 0 ve pricing null (hata değil)", () => {
    const [row] = buildReservationRows([res], [], [], lookups);
    expect(row.pricing).toBeNull();
    expect(row.net_amount).toBe(0);
  });
  test("tahsilat yüzdesi", () => {
    expect(collectedPercent(120000, 70000)).toBeCloseTo(58.33, 1);
    expect(collectedPercent(0, 0)).toBe(0);
    expect(collectedPercent(100, 150)).toBe(100);
  });
});

describe("arama", () => {
  test("ad (Türkçe büyük/küçük), telefon, tam tarih", () => {
    expect(matchSearch("AYŞE", lookups).customerIds).toEqual(["c1"]);
    expect(matchSearch("0555", lookups).customerIds).toEqual(["c2"]);
    expect(matchSearch("17.10.2026", lookups).date).toBe("2026-10-17");
    expect(matchSearch("7/1/2026", lookups).date).toBe("2026-01-07");
    expect(matchSearch("", lookups)).toEqual({ customerIds: null, date: null });
    expect(matchSearch("zzz", lookups).customerIds).toEqual([]);
  });
});

describe("takvim / tarih (Europe/Istanbul)", () => {
  test("Ekim 2026: hafta pazartesi başlar, 28 Eylül'le açılır, 5 hafta", () => {
    const g = monthGrid("2026-10-01");
    expect(g).toHaveLength(5);
    expect(g[0][0]).toBe("2026-09-28");
    expect(g[4][6]).toBe("2026-11-01");
  });
  test("ay kaydırma ve aralık", () => {
    expect(shiftMonth("2026-12-01", 1)).toBe("2027-01-01");
    expect(monthRange("2026-02-15")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });
  test("kart tarih bloğu ve başlıklar Türkçe", () => {
    expect(dateBlock("2026-10-17")).toEqual({ weekday: "CMT", day: "17", month: "Ekim" });
    expect(greetingDate("2026-10-11")).toBe("PAZAR, 11 EKİM");
    expect(greeting(9)).toBe("Günaydın");
    expect(greeting(20)).toBe("İyi akşamlar");
  });
});
