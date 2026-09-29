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
const ACIK = new Set(["fiyatlar"]);

function altYollar(grup: string): string[] {
  const d = path.join(KOK, grup);
  if (!fs.existsSync(d)) return [];
  return fs
    .readdirSync(d, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("[") && !e.name.startsWith("("))
    .map((e) => e.name);
}

test("oturum gerektiren her yol robots.txt'de engelli", () => {
  const kaynak = fs.readFileSync(path.join(KOK, "robots.ts"), "utf8");
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
