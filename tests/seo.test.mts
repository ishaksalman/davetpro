/**
 * Herkese açık sözleşme örneği ürünün gerçek şablonuyla aynı mı?
 *
 * Sayfa "bu metni DavetPro sizin için dolduruyor" diyor. Şablon bir
 * migration'da değişip örnek eski kalırsa söz yalana döner; en son
 * default_contract_body tanımıyla karşılaştırıyoruz.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ALAN_ETIKETLERI,
  SOZLESME_SABLONU,
  sablonuAyristir,
} from "../src/lib/sozlesme-ornegi.ts";

const MIG = path.join(import.meta.dirname, "..", "supabase", "migrations");

function sonTanim(): string {
  const dosyalar = fs.readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();
  let son = "";
  for (const f of dosyalar) {
    const s = fs.readFileSync(path.join(MIG, f), "utf8");
    const i = s.lastIndexOf("function public.default_contract_body(");
    if (i >= 0 && s.indexOf("$salon$", i) > 0) son = s.slice(i);
  }
  assert.ok(son, "default_contract_body tanımı bulunamadı");
  return son;
}

function govde(tanim: string, etiket: string): string {
  const a = tanim.indexOf(etiket) + etiket.length;
  return tanim.slice(a, tanim.indexOf(etiket, a));
}

test("salon örneği en son şablonla birebir aynı", () => {
  assert.equal(SOZLESME_SABLONU.salon, govde(sonTanim(), "$salon$"));
});

test("fotoğrafçı örneği en son şablonla birebir aynı", () => {
  assert.equal(SOZLESME_SABLONU.fotografci, govde(sonTanim(), "$foto$"));
});

test("her yer tutucunun okunur etiketi var", () => {
  const alanlar = new Set(
    [...(SOZLESME_SABLONU.salon + SOZLESME_SABLONU.fotografci).matchAll(/\{\{(\w+)\}\}/g)].map(
      (m) => m[1],
    ),
  );
  const eksik = [...alanlar].filter((a) => !ALAN_ETIKETLERI[a]);
  assert.deepEqual(eksik, [], `etiketi olmayan alanlar: ${eksik.join(", ")}`);
});

test("ayrıştırma madde sayısını ve yer tutucuları koruyor", () => {
  const salon = sablonuAyristir(SOZLESME_SABLONU.salon);
  assert.equal(salon.baslik, "ORGANİZASYON HİZMET SÖZLEŞMESİ");
  assert.equal(salon.maddeler.length, 16);
  assert.equal(sablonuAyristir(SOZLESME_SABLONU.fotografci).maddeler.length, 17);
  // Hiçbir "{{" ham metinde kalmamalı.
  const ham = salon.maddeler
    .flatMap((m) => m.paragraf)
    .filter((p) => p.tur === "metin" && p.metin.includes("{{"));
  assert.deepEqual(ham, []);
});

test("Word indirmesi geçerli bir .docx ve şablonun tüm maddelerini içeriyor", async () => {
  const { execFileSync } = await import("node:child_process");
  const os = await import("node:os");
  const { sozlesmeDocx } = await import("../src/lib/docx.ts");

  for (const [ad, sablon] of Object.entries(SOZLESME_SABLONU)) {
    const dosya = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "docx-")), `${ad}.docx`);
    fs.writeFileSync(dosya, sozlesmeDocx(sablon));
    // unzip -t: yerel başlık, CRC ve merkez dizin tutarlı mı?
    execFileSync("unzip", ["-tq", dosya]);
    const xml = execFileSync("unzip", ["-p", dosya, "word/document.xml"]).toString("utf8");
    for (const m of sablonuAyristir(sablon).maddeler) {
      assert.ok(xml.includes(m.baslik), `${ad}: "${m.baslik}" Word dosyasında yok`);
    }
    assert.ok(!xml.includes("{{"), `${ad}: işlenmemiş yer tutucu kaldı`);
  }
});
