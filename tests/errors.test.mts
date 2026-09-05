/**
 * Hata çevirisi testleri.
 *
 * Kritik olan: ham PostgREST/Postgres metni kullanıcıya sızmasın. Şema
 * eksikliği mesajı ayrıca sabit olarak karşılaştırıldığı için birebir eşleşmeli.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SCHEMA_OUTDATED_MESSAGE, toTurkishError } from "../src/lib/errors.ts";

test("eksik RPC fonksiyonu şema mesajına çevrilir", () => {
  const raw = {
    message:
      "Could not find the function public.venue_availability(p_end_time, p_event_date, p_ignore_lead_id, p_start_time) in the schema cache",
    code: "PGRST202",
  };
  assert.equal(toTurkishError(raw), SCHEMA_OUTDATED_MESSAGE);
});

test("şema önbelleği hatası da aynı mesaja çevrilir", () => {
  assert.equal(
    toTurkishError({ message: "stale schema cache" }),
    SCHEMA_OUTDATED_MESSAGE,
  );
});

test("trigger'dan gelen Türkçe mesaj olduğu gibi kalır", () => {
  const message =
    "05.05.2029 tarihinde bu salonda Akşam Düğünü adına kesin rezervasyon var (19:00 - 23:00).";
  assert.equal(toTurkishError({ message }), message);
});

test("rezervasyon çakışması kısıt adından tanınır", () => {
  const result = toTurkishError({
    message: 'conflicting key value violates exclusion constraint "reservations_no_overlap"',
  });
  assert.match(result, /rezervasyon var/);
  assert.doesNotMatch(result, /exclusion constraint/);
});

test("yetki hatası çevrilir", () => {
  assert.equal(
    toTurkishError({ code: "42501", message: "permission denied for table leads" }),
    "Bu işlem için yetkiniz yok.",
  );
});
