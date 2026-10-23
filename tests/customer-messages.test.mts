/**
 * Müşteriye giden hazır WhatsApp metinleri.
 *
 * İki risk: (1) fotoğrafçıya "salon/organizasyon" dili gitmesi, (2) finans
 * yetkisi olmayan kullanıcının mesajında tutar çıkması.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { customerMessages } from "../src/lib/reservation-notice.ts";
import { VERTICALS } from "../src/lib/vertical.ts";

const base = {
  organization_type: "dugun_nisan",
  event_date: "2026-10-31",
  start_time: "14:00:00",
  end_time: "16:00:00",
  location: "Kordon, İzmir",
  guest_count: null,
  venue: { id: "v", name: "A Platosu", color: "#000" },
  net_amount: 20000,
  collected_amount: 5000,
  balance_amount: 15000,
  due_date: "2026-11-15",
  delivery_link: "https://drive.google.com/x",
} as never;

const input = (sozluk: (typeof VERTICALS)["fotografci"], showFinance: boolean) => ({
  reservation: base,
  customerName: "Zeynep",
  businessName: "Ela Foto",
  showFinance,
  sozluk,
});

test("fotoğrafçı mesajında salon/organizasyon dili yok", () => {
  const metin = customerMessages(input(VERTICALS.fotografci, true))
    .map((m) => m.text)
    .join("\n");
  assert.doesNotMatch(metin, /[Ss]alon|organizasyon/);
  assert.match(metin, /çekiminiz/);
  // Fotoğrafçıda plato kavramı yok: konum adresten geliyor.
  assert.doesNotMatch(metin, /Plato/);
  assert.match(metin, /Yer: Kordon, İzmir/);
});

test("finans yetkisi yoksa tutar ve bakiye mesajı çıkmıyor", () => {
  const liste = customerMessages(input(VERTICALS.fotografci, false));
  assert.equal(liste.some((m) => m.key === "bakiye"), false);
  assert.doesNotMatch(liste.map((m) => m.text).join("\n"), /₺/);
});

test("bakiye yoksa hatırlatma listede yok", () => {
  const i = input(VERTICALS.fotografci, true);
  const liste = customerMessages({ ...i, reservation: { ...(base as object), balance_amount: 0 } as never });
  assert.equal(liste.some((m) => m.key === "bakiye"), false);
});

test("teslim mesajı yalnızca teslim akışı ve bağlantı varken", () => {
  assert.equal(customerMessages(input(VERTICALS.fotografci, true)).some((m) => m.key === "teslim"), true);
  assert.equal(customerMessages(input(VERTICALS.salon, true)).some((m) => m.key === "teslim"), false);
});
