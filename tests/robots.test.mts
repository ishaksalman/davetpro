/**
 * robots.txt engel listesi gerçek yollarla uyuşuyor mu?
 *
 * Liste elle tutuluyor: yeni bir uygulama ekranı eklenince buraya yazılması
 * unutulunca oturum duvarının arkasındaki sayfa taranmaya açık kalıyor.
 * Üç yol bu şekilde kaçmıştı.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const KOK = path.join(import.meta.dirname, "..", "src", "app");

/** Tanıtım sayfaları — bunlar BİLEREK taranabilir. */
const ACIK = new Set([
  "fiyatlar",
  "fotografci-programi",
  "organizasyon-programi",
  "dugun-salonu-sozlesme-ornegi",
  "fotografci-sozlesme-ornegi",
  "blog",
  "gizlilik",
  "kullanim-kosullari",
]);

function altYollar(grup: string): string[] {
  const d = path.join(KOK, grup);
  if (!fs.existsSync(d)) return [];
  return fs
    .readdirSync(d, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("[") && !e.name.startsWith("("))
    .map((e) => e.name);
}

test("oturum gerektiren her yol robots.txt'de engelli", () => {
  // Liste robots.ts ile lib/routes.ts arasında bölünmüş; ikisi birlikte okunuyor.
  const kaynak =
    fs.readFileSync(path.join(KOK, "robots.ts"), "utf8") +
    fs.readFileSync(path.join(KOK, "..", "lib", "routes.ts"), "utf8");
  const engelli = new Set(
    [...kaynak.matchAll(/"(\/[a-z0-9-]+)\/?"/g)].map((m) => m[1]),
  );

  const yollar = [
    ...altYollar("(app)"),
    ...altYollar("(auth)"),
    ...fs
      .readdirSync(KOK, { withFileTypes: true })
      .filter(
        (e) =>
          e.isDirectory() &&
          !e.name.startsWith("(") &&
          !e.name.startsWith("[") &&
          // Dosya rotaları (llms.txt) sayfa değil; taranması isteniyor.
          !e.name.includes(".") &&
          e.name !== "api",
      )
      .map((e) => e.name),
  ];

  const kacan = yollar.filter((y) => !ACIK.has(y) && !engelli.has(`/${y}`));
  assert.deepEqual(
    kacan,
    [],
    `robots.ts'e eklenmemiş yollar: ${kacan.map((y) => "/" + y).join(", ")}`,
  );
});

test("her tanıtım sayfası sitemap'te", () => {
  const kaynak = fs.readFileSync(path.join(KOK, "sitemap.ts"), "utf8");
  const eksik = [...ACIK].filter((y) => !kaynak.includes(`"/${y}"`));
  assert.deepEqual(eksik, [], `sitemap.ts'e eklenmemiş sayfalar: ${eksik.join(", ")}`);
});

test("tanıtım sayfaları proxy'de oturum istemiyor", async () => {
  const { KORUNAN_YOLLAR, onekUyar } = await import("../src/lib/routes.ts");
  const korunan = [...ACIK].filter((y) => onekUyar(`/${y}`, KORUNAN_YOLLAR));
  assert.deepEqual(korunan, [], `giriş isteyen tanıtım sayfası: ${korunan.join(", ")}`);
  // Segment sınırı: "/panelx" gibi bir yol korumalı sayılmamalı, "/panel/x" sayılmalı.
  assert.equal(onekUyar("/panelx", KORUNAN_YOLLAR), false);
  assert.equal(onekUyar("/panel/x", KORUNAN_YOLLAR), true);
  assert.equal(onekUyar("/olmayan-sayfa", KORUNAN_YOLLAR), false);
});
