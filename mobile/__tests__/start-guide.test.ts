import { guideComplete, guideSteps, nextGuideStepId } from "../src/lib/domain/start-guide";

const base = {
  business: { phone: null, address: null },
  venues: [] as { is_active: boolean; allows_overlap: boolean; name: string }[],
  packages: [] as { is_active: boolean }[],
  reservationCount: 0,
  usesResource: true,
  resourceSingular: "Salon",
};
const ids = (s: ReturnType<typeof guideSteps>) => s.map((x) => x.id);

describe("başlangıç rehberi (web onboardingSteps ile aynı kurallar)", () => {
  it("salonda dört adım var ve sırası işletme → salon → paket → rezervasyon", () => {
    expect(ids(guideSteps(base))).toEqual(["isletme", "kaynak", "paket", "rezervasyon"]);
  });
  it("fotoğrafçıda kaynak adımı hiç çıkmaz", () => {
    expect(ids(guideSteps({ ...base, usesResource: false, resourceSingular: "Plato" }))).toEqual(["isletme", "paket", "rezervasyon"]);
  });
  it("işletme adımı telefon VE adres dolunca biter (boşluk sayılmaz)", () => {
    const only = (b: { phone: string | null; address: string | null }) => guideSteps({ ...base, business: b }).find((s) => s.id === "isletme")!.done;
    expect(only({ phone: "0532", address: null })).toBe(false);
    expect(only({ phone: " ", address: "Yalova" })).toBe(false);
    expect(only({ phone: "0532", address: "Yalova" })).toBe(true);
  });
  it("kaynak: yalnızca kendine ait (çakışmaya izin vermeyen) aktif kayıt adımı bitirir", () => {
    const open = { is_active: true, allows_overlap: true, name: "Dış mekân" };
    const own = { is_active: true, allows_overlap: false, name: "Gül Salon" };
    const k = (venues: typeof base.venues) => guideSteps({ ...base, venues }).find((s) => s.id === "kaynak")!;
    expect(k([open]).done).toBe(false);
    expect(k([open]).optional).toBe(true);
    expect(k([open]).description).toContain("Dış mekân");
    expect(k([open, own]).done).toBe(true);
    expect(k([{ ...own, is_active: false }]).done).toBe(false);
    expect(k([]).optional).toBe(false);
  });
  it("paket isteğe bağlı; yalnızca aktif paket sayılır", () => {
    const p = (packages: typeof base.packages) => guideSteps({ ...base, packages }).find((s) => s.id === "paket")!;
    expect(p([]).optional).toBe(true);
    expect(p([{ is_active: false }]).done).toBe(false);
    expect(p([{ is_active: true }]).done).toBe(true);
  });
  it("rezervasyon kaynak kaydı yokken engellenir, varken açılır", () => {
    const r = (venues: typeof base.venues) => guideSteps({ ...base, venues }).find((s) => s.id === "rezervasyon")!;
    expect(r([]).blockedReason).toBe("Önce salon ekle");
    expect(r([{ is_active: true, allows_overlap: true, name: "Dış mekân" }]).blockedReason).toBeUndefined();
  });
  it("sıradaki adım ilk eksik zorunlu adımdır; isteğe bağlı adım sırayı tutmaz", () => {
    const venues = [{ is_active: true, allows_overlap: true, name: "Dış mekân" }];
    expect(nextGuideStepId(guideSteps({ ...base, venues }))).toBe("isletme");
    const filled = { ...base, venues, business: { phone: "1", address: "x" } };
    expect(nextGuideStepId(guideSteps(filled))).toBe("rezervasyon");
    expect(nextGuideStepId(guideSteps({ ...filled, reservationCount: 1 }))).toBeUndefined();
  });
  it("zorunlu adımlar bitince rehber tamamlanmış sayılır", () => {
    const venues = [{ is_active: true, allows_overlap: true, name: "Dış mekân" }];
    const s = guideSteps({ ...base, venues, business: { phone: "1", address: "x" }, reservationCount: 2 });
    expect(guideComplete(s)).toBe(true);
    expect(guideComplete(guideSteps(base))).toBe(false);
  });
});
