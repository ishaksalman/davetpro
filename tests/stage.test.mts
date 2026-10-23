/**
 * Birleşik durum ekseni.
 *
 * Arayüzde tek menü var ama altta iki kolon duruyor; eşleşme bozulursa
 * "teslim edildi" diyen bir iş raporda hâlâ devam ediyor görünebilir.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { STAGES, STAGE_FLOW, reservationStage } from "../src/lib/stage.ts";

test("menüdeki sıra kullanıcının istediği sıra", () => {
  assert.deepEqual(
    STAGE_FLOW.map((s) => STAGES[s].label),
    ["Oluşturuldu", "Çekim yapıldı", "Seçim bekleniyor", "Düzenleniyor", "Baskıda", "Teslim edildi"],
  );
});

test("iptal menüde yok — ayrı butonda", () => {
  assert.equal(STAGE_FLOW.includes("iptal_edildi"), false);
});

test("iki kolondan görünen aşama türetiliyor", () => {
  assert.equal(reservationStage("kesinlesti", null), "olusturuldu");
  assert.equal(reservationStage("kesinlesti", "baskida"), "baskida");
  assert.equal(reservationStage("tamamlandi", "teslim_edildi"), "teslim_edildi");
});

test("iptal, ilerlemiş aşamayı ezer", () => {
  // İptal edilmiş işe "Baskıda" demek yanlış olurdu; kolon ise geri alma
  // ihtimali için temizlenmiyor.
  assert.equal(reservationStage("iptal_edildi", "baskida"), "iptal_edildi");
  assert.equal(reservationStage("iptal_edildi", null), "iptal_edildi");
});

test("teslim edildi satış durumunu da tamamlandıya çeker", () => {
  assert.deepEqual(STAGES.teslim_edildi.writes, {
    status: "tamamlandi",
    delivery_status: "teslim_edildi",
  });
});

test("oluşturuldu teslim aşamasını temizler", () => {
  assert.deepEqual(STAGES.olusturuldu.writes, {
    status: "kesinlesti",
    delivery_status: null,
  });
});

test("iptal sonrası aşama seçmek iptali geri alır", () => {
  // Menüden herhangi bir aşama seçilince status yeniden yazılıyor.
  for (const s of STAGE_FLOW) {
    assert.notEqual(STAGES[s].writes.status, "iptal_edildi", s);
  }
});

test("her aşamanın yazdığı değerler kendi anlamıyla tutarlı", () => {
  for (const s of STAGE_FLOW) {
    const w = STAGES[s].writes;
    // 'olusturuldu' dışında teslim kolonu aşamanın kendisi olmalı.
    assert.equal(w.delivery_status, s === "olusturuldu" ? null : s);
  }
});

// Filtre iki eksende çalışıyor. Salonda birleşik ekseni kullansaydık
// 'tamamlandi' kayıtları hiçbir seçeneğe düşmezdi: Stage'de karşılığı yok.
test("salonun 'tamamlandi' kaydı birleşik eksende karşılıksız", () => {
  // Bu, tabloda salon için ham status'e düşmemizin sebebi.
  assert.equal(reservationStage("tamamlandi", null), "olusturuldu");
  assert.equal(STAGE_FLOW.includes("tamamlandi" as never), false);
});

test("fotoğrafçıda her aşama filtrede karşılık buluyor", () => {
  const secenekler = [...STAGE_FLOW, "iptal_edildi"];
  const ornekler: [Parameters<typeof reservationStage>[0], Parameters<typeof reservationStage>[1]][] = [
    ["kesinlesti", null],
    ["kesinlesti", "cekim_yapildi"],
    ["kesinlesti", "secim_bekleniyor"],
    ["kesinlesti", "duzenleniyor"],
    ["kesinlesti", "baskida"],
    ["tamamlandi", "teslim_edildi"],
    ["iptal_edildi", null],
  ];
  for (const [st, d] of ornekler) {
    assert.ok(secenekler.includes(reservationStage(st, d)), `${st}/${d}`);
  }
});

test("tarihi geçmiş ve aşamasız iş çekim yapıldı sayılır", () => {
  assert.equal(reservationStage("kesinlesti", null, true), "cekim_yapildi");
  assert.equal(reservationStage("kesinlesti", null, false), "olusturuldu");
});

test("türetme iptali ve işaretlenmiş aşamayı ezmez", () => {
  assert.equal(reservationStage("iptal_edildi", null, true), "iptal_edildi");
  assert.equal(reservationStage("kesinlesti", "baskida", true), "baskida");
});

test("etkinlik bitti mi: gün ve saat, işletme saatine göre", async () => {
  const { isShootOver } = await import("../src/lib/time.ts");
  const an = new Date("2026-10-23T12:00:00Z"); // İstanbul 15:00
  assert.equal(isShootOver("2026-10-22", "23:00", "19:00", an), true);
  assert.equal(isShootOver("2026-10-24", "10:00", "08:00", an), false);
  assert.equal(isShootOver("2026-10-23", "14:00", "12:00", an), true);
  assert.equal(isShootOver("2026-10-23", "16:00", "12:00", an), false);
  // Gece yarısını aşan iş bugün içinde bitmiş sayılmaz.
  assert.equal(isShootOver("2026-10-23", "01:00", "22:00", an), false);
});
