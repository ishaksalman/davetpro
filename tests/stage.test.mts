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
