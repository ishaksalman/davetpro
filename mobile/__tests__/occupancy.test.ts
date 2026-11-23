import { monthOccupancy, sixMonthRanges } from "../src/lib/domain/occupancy";

describe("monthOccupancy", () => {
  const oct = new Date(2026, 9, 25); // 31 gün
  it("salonlu işletmede gün×salon çiftlerini sayar", () => {
    const rows = [
      { event_date: "2026-10-03", venue_id: "a" },
      { event_date: "2026-10-03", venue_id: "b" },
      { event_date: "2026-10-10", venue_id: "a" },
    ];
    expect(monthOccupancy(rows, oct, 2)).toBe(Math.round((3 / 62) * 100));
  });
  it("aynı salon aynı gün çift sayılmaz", () => {
    const rows = [{ event_date: "2026-10-03", venue_id: "a" }, { event_date: "2026-10-03", venue_id: "a" }];
    expect(monthOccupancy(rows, oct, 1)).toBe(Math.round((1 / 31) * 100));
  });
  it("salonsuz işletmede dolu günleri sayar", () => {
    const rows = [{ event_date: "2026-10-03", venue_id: null }, { event_date: "2026-10-03", venue_id: null }, { event_date: "2026-10-04", venue_id: null }];
    expect(monthOccupancy(rows, oct, 0)).toBe(Math.round((2 / 31) * 100));
  });
  it("boşta 0", () => expect(monthOccupancy([], oct, 3)).toBe(0));
});

describe("sixMonthRanges", () => {
  it("içinde bulunulan ay dahil son 6 ayı eskiden yeniye verir", () => {
    const r = sixMonthRanges(new Date(2026, 9, 25));
    expect(r.map((x) => x.label)).toEqual(["May", "Haz", "Tem", "Ağu", "Eyl", "Eki"]);
    expect(r[0]).toEqual({ from: "2026-05-01", to: "2026-05-31", label: "May" });
    expect(r[5]).toEqual({ from: "2026-10-01", to: "2026-10-31", label: "Eki" });
  });
  it("yıl sınırını aşar", () => {
    const r = sixMonthRanges(new Date(2027, 1, 10));
    expect(r[0].from).toBe("2026-09-01");
    expect(r[5].to).toBe("2027-02-28");
  });
});
