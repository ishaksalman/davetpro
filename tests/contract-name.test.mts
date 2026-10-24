/**
 * Sözleşmede taraf olarak yazılan ad.
 *
 * Çift adı ("Ayşe & Ahmet") sözleşmede taraf olamaz; imzalayan tek kişidir.
 * Müşteri kaydında ayrı bir `contract_name` tutuluyor ve belgeye O yazılmalı.
 *
 * Bu dosya ASIL kurucuyu sınıyor. Salon uçtan uca testinde anlık görüntü
 * elle kuruluyordu, yani kurucudaki eksik hiç yakalanmıyordu.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildContractSnapshot,
  contractVariableValues,
  missingBusinessFields,
  missingCustomerFields,
  sozlesmeAdi,
} from "../src/lib/contracts.ts";
import {
  contractNoticeMessage,
  reservationNoticeMessage,
} from "../src/lib/reservation-notice.ts";
import { VERTICALS } from "../src/lib/vertical.ts";

const musteri = {
  id: "c1",
  business_id: "b1",
  full_name: "Ayşe & Ahmet Salman",
  contract_name: "Ahmet Salman",
  phone: "05001112233",
  email: null,
  address: null,
  national_id: "12345678901",
  phone2: null,
  notes: null,
  created_at: "",
  updated_at: "",
} as never;

const isletme = {
  id: "b1",
  name: "Gül Düğün Salonu",
  business_type: "salon",
  authorized_person: "İshak",
  phone: null, email: null, address: null, city: null,
  tax_office: null, tax_number: null, logo_url: null,
  created_at: "", updated_at: "",
} as never;

const rezervasyon = {
  id: "r1",
  organization_type: "dugun",
  event_date: "2027-06-06",
  start_time: "14:00",
  end_time: "20:00",
  guest_count: 400,
  location: null,
  notes: null,
  venue: { id: "v1", name: "Balo Salonu", color: "#000" },
  package: null,
  items: [],
  pricing: null,
} as never;

const profil = { id: "p1", full_name: "İshak" } as never;

function anlik() {
  return buildContractSnapshot({
    business: isletme,
    customer: musteri,
    reservation: rezervasyon,
    profile: profil,
    today: "2026-09-16",
  });
}

test("anlık görüntü sözleşme adını taşıyor", () => {
  assert.equal(anlik().customer.contract_name, "Ahmet Salman");
});

test("şablondaki {{customer_name}} sözleşme adını basıyor", () => {
  const p = contractVariableValues(anlik(), "—");
  assert.equal(p.customer_name, "Ahmet Salman");
  assert.notEqual(p.customer_name, "Ayşe & Ahmet Salman");
});

test("sözleşme adı boşsa ad soyada düşülüyor", () => {
  assert.equal(sozlesmeAdi({ full_name: "Ali Veli", contract_name: null }), "Ali Veli");
  assert.equal(sozlesmeAdi({ full_name: "Ali Veli", contract_name: "   " }), "Ali Veli");
});

test("alan eklenmeden önceki sözleşmeler ad soyadla kalıyor", () => {
  // Donmuş belge sonradan değiştirilemez: o sözleşme öyle imzalandı.
  assert.equal(sozlesmeAdi({ full_name: "Eski Kayıt" }), "Eski Kayıt");
});

test("sözleşme adı doluysa ad soyad kullanılmıyor", () => {
  assert.equal(sozlesmeAdi(musteri), "Ahmet Salman");
});

test("eksik müşteri bilgisi: adres her zaman, e-posta şablon isterse, kimlik hiç", () => {
  const bos = { contract_name: "Ahmet", email: null, address: " ", national_id: null };
  assert.deepEqual(missingCustomerFields(bos, "Taraf: {{customer_name}}"), ["Adres"]);
  assert.deepEqual(
    missingCustomerFields(bos, "E-posta: {{ customer_email }} {{customer_national_id}}"),
    ["Adres", "E-posta"],
  );
  assert.deepEqual(
    missingCustomerFields({ ...bos, contract_name: null, address: "Bahçelievler" }, ""),
    ["Sözleşmede geçecek ad"],
  );
  assert.deepEqual(
    missingCustomerFields({ contract_name: "Ahmet", email: "a@b.com", address: "X" }, "{{customer_email}}"),
    [],
  );
});

test("eksik işletme bilgisi: adres, telefon, yetkili her zaman; vergi şablon isterse", () => {
  const bos = { address: null, phone: "", authorized_person: null, email: null, tax_office: null, tax_number: null };
  assert.deepEqual(missingBusinessFields(bos, "{{business_name}}"), ["Adres", "Telefon", "Yetkili kişi"]);
  assert.deepEqual(
    missingBusinessFields({ ...bos, address: "Yalova", phone: "0532", authorized_person: "İshak" }, "{{ business_tax_number }}"),
    ["Vergi numarası"],
  );
  assert.deepEqual(
    missingBusinessFields({ address: "Yalova", phone: "0532", authorized_person: "İshak" }, ""),
    [],
  );
});

test("sözleşme mesajı: rezervasyon bilgisi aynen, altında bağlantı, en sonda imza", () => {
  const input = {
    reservation: {
      ...(rezervasyon as object),
      net_amount: 110000,
      collected_amount: 20000,
      balance_amount: 90000,
      due_date: null,
    } as never,
    customerName: "Ayşe & Ahmet",
    businessName: "Gül Düğün Salonu",
    showFinance: true,
    sozluk: VERTICALS.salon,
  };
  const url = "https://www.davetpro.com/s/0123456789abcdef0123456789abcdef";
  const satirlar = contractNoticeMessage(input, url).split("\n");
  const bilgi = reservationNoticeMessage(input).split("\n");

  // İmza hariç rezervasyon bilgisi birebir aynı.
  assert.deepEqual(satirlar.slice(0, bilgi.length - 1), bilgi.slice(0, -1));
  assert.equal(satirlar.at(-1), "Gül Düğün Salonu");
  assert.equal(satirlar.at(-3), url);
  assert.ok(satirlar.includes("Kalan: ₺90.000"));
});
