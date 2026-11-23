import { normalizeHttpsLink } from "~/lib/domain/links";

describe("teslim bağlantısı", () => {
  test("boş → kaldırılır", () => expect(normalizeHttpsLink("  ")).toEqual({ ok: true, url: null }));
  test("https kabul", () => expect(normalizeHttpsLink("https://galeri.example.com/a?b=1")).toEqual({ ok: true, url: "https://galeri.example.com/a?b=1" }));
  test("http, javascript ve düz metin reddedilir", () => {
    for (const v of ["http://x.com", "javascript:alert(1)", "galeri.com", "ftp://x.com"]) {
      expect(normalizeHttpsLink(v)).toEqual({ ok: false, error: "Geçerli bir https:// bağlantısı girin." });
    }
  });
  test("çok uzun reddedilir", () => expect(normalizeHttpsLink(`https://x.com/${"a".repeat(2100)}`)).toEqual({ ok: false, error: "Bağlantı çok uzun." }));
});
