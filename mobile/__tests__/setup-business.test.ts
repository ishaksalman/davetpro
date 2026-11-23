import { setupBusinessSchema } from "../src/lib/domain/auth-schemas";

describe("işletme kurulumu şeması (web setupBusinessAction ile aynı kurallar)", () => {
  const ok = { businessName: "  Gül Düğün Salonu ", fullName: " Ayşe Yılmaz ", businessType: "salon" as const };

  it("adları kırpar ve geçerli girdiyi kabul eder", () => {
    const r = setupBusinessSchema.parse(ok);
    expect(r).toEqual({ businessName: "Gül Düğün Salonu", fullName: "Ayşe Yılmaz", businessType: "salon" });
  });
  it("işletme adı çok kısaysa web ile aynı mesajı verir", () => {
    const r = setupBusinessSchema.safeParse({ ...ok, businessName: " a " });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("İşletme adı en az 2 karakter olmalı.");
  });
  it("ad soyad çok kısa/uzunsa hata verir", () => {
    expect(setupBusinessSchema.safeParse({ ...ok, fullName: "x" }).success).toBe(false);
    expect(setupBusinessSchema.safeParse({ ...ok, fullName: "x".repeat(121) }).success).toBe(false);
  });
  it("her üç işletme türü geçer", () => {
    for (const t of ["salon", "fotografci", "organizasyon"] as const) {
      expect(setupBusinessSchema.parse({ ...ok, businessType: t }).businessType).toBe(t);
    }
  });
  it("geçersiz ya da eksik tür salona düşer (web ile aynı)", () => {
    expect(setupBusinessSchema.parse({ ...ok, businessType: "x" as never }).businessType).toBe("salon");
    expect(setupBusinessSchema.parse({ businessName: ok.businessName, fullName: ok.fullName }).businessType).toBe("salon");
  });
});
