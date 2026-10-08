/**
 * Dikey tanımları tutarlı mı?
 *
 * Üçüncü dikey eklenirken kayıt şemasındaki tip listesi elle yazılı kalmıştı
 * ve .catch() yeni tipi sessizce "salon"a çevirdi — işletme yanlış tiple
 * açıldı, hiçbir yerde hata görünmedi. Bu testler o sınıf hatayı yakalıyor.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BUSINESS_TYPES, VERTICALS, vertical } from "../src/lib/vertical.ts";

test("her iş türünün sözlük tanımı var", () => {
  for (const t of BUSINESS_TYPES) {
    assert.ok(VERTICALS[t], `${t} için tanım yok`);
    assert.ok(VERTICALS[t].label.length > 0, `${t} etiketi boş`);
  }
});

test("sözlükteki her tip seçim listesinde", () => {
  const secilebilir = new Set<string>(BUSINESS_TYPES);
  for (const t of Object.keys(VERTICALS)) {
    assert.ok(secilebilir.has(t), `${t} BUSINESS_TYPES'ta yok`);
  }
});

test("bilinmeyen ve boş tip salona düşüyor", () => {
  assert.equal(vertical(undefined), VERTICALS.salon);
  assert.equal(vertical(null), VERTICALS.salon);
});

test("yalnızca organizasyon firması konum seçimi ve kapasite kullanıyor", () => {
  for (const t of BUSINESS_TYPES) {
    const beklenen = t === "organizasyon";
    assert.equal(VERTICALS[t].usesLocationChoice, beklenen, `${t} konum seçimi`);
    assert.equal(VERTICALS[t].usesCapacity, beklenen, `${t} kapasite`);
  }
});
