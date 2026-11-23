import { formatMoneyInput, formatTimeInput, isValidTime, moneyToInput, parseMoneyInput } from "~/lib/domain/money-input";
import { moneyField } from "@/lib/schemas";

describe("tutar girişi (tr-TR)", () => {
  test("yazarken binlik ayraç eklenir", () => {
    expect(formatMoneyInput("1")).toBe("1");
    expect(formatMoneyInput("1250")).toBe("1.250");
    expect(formatMoneyInput("120000")).toBe("120.000");
    expect(formatMoneyInput("1.250" + "0")).toBe("12.500");
  });
  test("ondalık virgül; en fazla 2 hane", () => {
    expect(formatMoneyInput("1250,5")).toBe("1.250,5");
    expect(formatMoneyInput("1250,567")).toBe("1.250,56");
    expect(formatMoneyInput(",5")).toBe("0,5");
    expect(formatMoneyInput("12,5,3")).toBe("12,53");
  });
  test("klavyede nokta yazılırsa (ondalık ayraç) virgüle çevrilir", () => {
    expect(formatMoneyInput("1.250.")).toBe("1.250,");
    expect(formatMoneyInput("12.")).toBe("12,");
  });
  test("harf ve işaretler atılır, baştaki sıfırlar silinir", () => {
    expect(formatMoneyInput("₺ab12-3")).toBe("123");
    expect(formatMoneyInput("007")).toBe("7");
    expect(formatMoneyInput("0")).toBe("0");
  });
  test("sayıya çevirme kuruş hassasiyetli", () => {
    expect(parseMoneyInput("120.000")).toBe(120000);
    expect(parseMoneyInput("1.250,50")).toBe(1250.5);
    expect(parseMoneyInput("0,1")).toBe(0.1);
    expect(parseMoneyInput("")).toBeNull();
    expect(parseMoneyInput(",")).toBeNull();
  });
  test("sayı → metin → sayı gidiş dönüş", () => {
    for (const n of [0.01, 1, 25000, 1250.5, 99999999.99, 120000.07]) {
      expect(parseMoneyInput(moneyToInput(n))).toBe(n);
    }
    expect(moneyToInput(0)).toBe("");
    expect(moneyToInput(null)).toBe("");
  });
  test("web moneyField şemasına GİRDİĞİNDE doğru tutar çıkar (number ile)", () => {
    expect(moneyField.parse(1250.5)).toBe(1250.5);
    // Uyarı: ham metin "120000.5" web şemasında 1200005 olur — mobil ham metin göndermez.
    expect(moneyField.parse("120000.5")).toBe(1200005);
  });
  test("saat girişi", () => {
    expect(formatTimeInput("1930")).toBe("19:30");
    expect(formatTimeInput("19")).toBe("19");
    expect(formatTimeInput("19:3x0")).toBe("19:30");
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("9:00")).toBe(false);
  });
});
