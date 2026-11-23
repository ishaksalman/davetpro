import { passwordStrength } from "~/lib/domain/password-strength";

describe("şifre gücü", () => {
  test("boş ve kısa şifre", () => {
    expect(passwordStrength("").level).toBe(0);
    expect(passwordStrength("abc12").level).toBe(1);
  });
  test("8+ karakter ama rakamsız → orta, ne yapılacağını söyler", () => {
    expect(passwordStrength("abcdefgh")).toEqual({ level: 2, label: "Orta — bir rakam daha ekle" });
  });
  test("rakam ekleyince iyi; karışık harf + sembol + 10 karakter güçlü", () => {
    expect(passwordStrength("abcdefg1").level).toBe(3);
    expect(passwordStrength("Abcdefgh1!").level).toBe(4);
  });
});
