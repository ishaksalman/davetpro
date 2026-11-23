import { barHeights, lastSixMonths, monthShort, presetRange } from "~/lib/domain/ranges";
import { buildAgenda, dayDots, dayHeading } from "~/lib/domain/agenda";
import type { ReservationRow } from "~/lib/data/types";

jest.mock("~/lib/supabase", () => ({ supabase: {} }));

describe("dönem aralıkları (işletme günü)", () => {
  const now = new Date(2026, 9, 24); // 24 Ekim 2026 (yerel)
  test("bu ay / geçen ay / son 3 ay / bu yıl", () => {
    expect(presetRange("bu-ay", now)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(presetRange("gecen-ay", now)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(presetRange("son-3-ay", now)).toEqual({ from: "2026-08-01", to: "2026-10-31" });
    expect(presetRange("bu-yil", now)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
  test("ocakta geçen ay önceki yıla taşar", () => {
    expect(presetRange("gecen-ay", new Date(2026, 0, 5))).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });
  test("son 6 ay ve ay adları", () => {
    expect(lastSixMonths(now)).toEqual({ from: "2026-05-01", to: "2026-10-31" });
    expect(monthShort("2026-05-01")).toBe("May");
    expect(monthShort("2026-12-01")).toBe("Ara");
  });
  test("çubuk yükseklikleri ölçekli; sıfır sıfır, pozitif en az 2 px", () => {
    expect(barHeights([100, 50, 0, 1], 96)).toEqual([96, 48, 0, 2]);
    expect(barHeights([0, 0], 96)).toEqual([0, 0]);
  });
});

const res = (id: string, date: string, start: string, venue: string, color: string) =>
  ({ id, event_date: date, start_time: `${start}:00`, end_time: "23:00:00", venue_id: venue, venue: { id: venue, name: venue, color }, customer: { id: "c", full_name: id, phone: "" } }) as unknown as ReservationRow;

describe("ajanda", () => {
  const rows = [res("b", "2026-10-17", "19:00", "v1", "#6366f1"), res("a", "2026-10-17", "13:00", "v2", "#ec4899"), res("c", "2026-10-18", "10:00", "v1", "#6366f1")];
  const holds = [{ id: "h1", lead_id: "l", venue_id: "v1", event_date: "2026-10-17", start_time: "16:00:00", end_time: "18:00:00", expires_at: "", customer_name: "Can", venue_color: "#6366f1", venue_name: "v1" }];
  test("gün içi sıra başlangıç saatine göre; opsiyon da dahil", () => {
    const a = buildAgenda(rows, holds, null);
    expect(a.get("2026-10-17")!.map((i) => i.key)).toEqual(["a", "h-h1", "b"]);
  });
  test("salon filtresi", () => {
    const a = buildAgenda(rows, holds, "v2");
    expect([...a.keys()]).toEqual(["2026-10-17"]);
    expect(a.get("2026-10-17")).toHaveLength(1);
  });
  test("gün noktaları salon renkleri", () => {
    expect(dayDots(buildAgenda(rows, holds, null))["2026-10-17"]).toEqual(["#ec4899", "#6366f1", "#6366f1"]);
  });
  test("gün başlığı Türkçe büyük harf", () => {
    expect(dayHeading("2026-10-17")).toBe("17 EKİM, CUMARTESİ");
  });
});
