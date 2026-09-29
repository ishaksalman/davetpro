/**
 * İçerik klasörü ile kayıt uyuşuyor mu?
 *
 * Kayıt elle tutuluyor (nedeni src/lib/blog.ts içinde). Dosyayı ekleyip
 * kaydı unutmak sessiz bir hata: yazı ne listede ne sitemap'te görünür,
 * hiçbir yerde uyarı çıkmaz.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tumSluglar, yayindakiYazilar } from "../src/lib/blog.ts";

const KLASOR = path.join(import.meta.dirname, "..", "src", "content", "blog");

test("her .mdx dosyası kayıtta var", () => {
  const dosyalar = fs
    .readdirSync(KLASOR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
  const kayitli = new Set(tumSluglar());
  const eksik = dosyalar.filter((d) => !kayitli.has(d));
  assert.deepEqual(eksik, [], `blog.ts'e eklenmemiş yazılar: ${eksik.join(", ")}`);
});

test("kayıttaki her yazının dosyası var", () => {
  const olmayan = tumSluglar().filter(
    (s) => !fs.existsSync(path.join(KLASOR, `${s}.mdx`)),
  );
  assert.deepEqual(olmayan, [], `dosyası olmayan kayıtlar: ${olmayan.join(", ")}`);
});

test("slug'lar benzersiz", () => {
  const hepsi = tumSluglar();
  assert.equal(new Set(hepsi).size, hepsi.length, "yinelenen slug var");
});

test("yayındakiler yeniden eskiye sıralı", () => {
  const t = yayindakiYazilar().map((y) => y.tarih);
  assert.deepEqual(t, [...t].sort().reverse());
});
