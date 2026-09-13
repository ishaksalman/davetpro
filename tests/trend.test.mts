import { test } from "node:test";
import assert from "node:assert/strict";
import { monthOverMonth } from "../src/lib/trend.ts";

test("artış yüzdesi doğru", () => {
  const t = monthOverMonth(115, 100);
  assert.equal(t?.label, "Geçen aya göre %15 artış");
  assert.equal(t?.direction, "up");
});

test("azalış yüzdesi doğru", () => {
  const t = monthOverMonth(80, 100);
  assert.equal(t?.label, "Geçen aya göre %20 azalış");
  assert.equal(t?.direction, "down");
});

test("geçen ay sıfırsa kıyas YAPILMAZ", () => {
  // %100 artış demek yanıltıcı olurdu: sıfırdan çıkışın oranı tanımsız.
  assert.equal(monthOverMonth(50000, 0), null);
  assert.equal(monthOverMonth(50000, null), null);
});

test("iki dönem de sıfırsa kıyas yok", () => {
  assert.equal(monthOverMonth(0, 0), null);
});

test("yuvarlandığında fark kalmıyorsa 'aynı' denir", () => {
  const t = monthOverMonth(1002, 1000);
  assert.equal(t?.direction, "flat");
  assert.equal(t?.label, "Geçen ayla aynı");
});

test("metin girdisi de okunur", () => {
  assert.equal(monthOverMonth("150", "100")?.label, "Geçen aya göre %50 artış");
});
