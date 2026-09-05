/**
 * Demo verisi — son 1 ay (Ağustos 2026) için müşteri, rezervasyon, tahsilat, gider.
 *
 * Kayıtlar SABİT UUID'lerle yazılır; bu sayede tekrar çalıştırmak veri
 * çoğaltmaz (upsert) ve `--temizle` ile hepsi eksiksiz silinebilir.
 * Gerçek kayıtlarınıza dokunmaz.
 *
 *   node supabase/seed/demo.mjs            # ekle / güncelle
 *   node supabase/seed/demo.mjs --temizle  # yalnızca demo kayıtlarını sil
 */
import fs from "node:fs";
import path from "node:path";

const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);

const BASE = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error("SUPABASE_SERVICE_ROLE_KEY gerekli."); process.exit(1); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rest(method, path, body, prefer) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method,
    headers: prefer ? { ...H, Prefer: prefer } : H,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
const get = (p) => rest("GET", p);
const upsert = (t, rows) => rest("POST", t, rows, "resolution=merge-duplicates,return=minimal");
const del = (p) => rest("DELETE", p, undefined, "return=minimal");

// --- Sabit kimlikler (silme bunlara dayanır) ---------------------------------
const uid = (prefix, n) => `dddddddd-dddd-4ddd-8ddd-${prefix}${String(n).padStart(11, "0")}`;
const CUSTOMER = (n) => uid("c", n);
const RESERVATION = (n) => uid("a", n);
const PAYMENT = (n) => uid("b", n);
const EXPENSE = (n) => uid("e", n);
/**
 * Tüm demo kimlikleri "dddddddd-dddd-4ddd-8ddd-" önekini paylaşır.
 * uuid kolonunda LIKE çalışmadığı için aralık karşılaştırması kullanılır
 * (PostgreSQL uuid'leri bayt sırasına göre karşılaştırır).
 */
const demoRange = (column = "id") =>
  `${column}=gte.dddddddd-dddd-4ddd-8ddd-000000000000&` +
  `${column}=lte.dddddddd-dddd-4ddd-8ddd-ffffffffffff`;

// --- Temizlik ----------------------------------------------------------------
if (process.argv.includes("--temizle")) {
  // Sıra önemli: bağlı kayıtlar önce (FK RESTRICT).
  await del(`expenses?${demoRange()}`);
  await del(`payments?${demoRange()}`);
  await del(`reservation_pricing?${demoRange("reservation_id")}`);
  await del(`reservations?${demoRange()}`);
  await del(`customers?${demoRange()}`);
  console.log("Demo kayıtları silindi.");
  process.exit(0);
}

// --- Bağlam ------------------------------------------------------------------
const [business] = await get("businesses?select=id,name&limit=1");
const [owner] = await get("profiles?select=id&role=eq.owner&limit=1");
const venues = await get("venues?select=id,name&order=name");
const packages = await get("packages?select=id,name,base_price,pricing_type");
const categories = await get("expense_categories?select=id,name");

const B = business.id;
const nisan = venues.find((v) => v.name.includes("Nişan")) ?? venues[0];
const kir = venues.find((v) => v.name.includes("Kır")) ?? venues[venues.length - 1];
const pkg = (name) => packages.find((p) => p.name.includes(name)) ?? null;
const cat = (name) => categories.find((c) => c.name.startsWith(name))?.id ?? categories[0].id;

// --- Müşteriler --------------------------------------------------------------
const customers = [
  ["Selin & Kaan Aydın", "05321114455", "selin.aydin@example.com", "Kır düğünü, açık büfe istiyorlar."],
  ["Merve & Emre Doğan", "05337772211", null, "Nişan için sade dekorasyon."],
  ["Ayşe & Mustafa Kılıç", "05055558899", "ayse.kilic@example.com", null],
  ["Büşra & Hakan Yıldız", "05442223366", null, "Kına gecesi, canlı müzik."],
  ["Ece & Onur Şahin", "05386661177", "ece.sahin@example.com", "Söz töreni, 80 kişi."],
  ["Zehra & Furkan Arslan", "05319998844", null, "Sünnet düğünü, çocuk animasyonu."],
  ["Nisa & Berk Çetin", "05074443322", "nisa.cetin@example.com", "Premium menü, video çekimi."],
  ["Elif & Serkan Koç", "05366667788", null, null],
  ["Damla & Tolga Yılmaz", "05391112233", "damla.yilmaz@example.com", "Kurumsal yılsonu daveti."],
  ["Sude & Ali Demirci", "05428889900", null, "Fotoğrafçı kendileri getirecek."],
].map(([full_name, phone, email, notes], i) => ({
  id: CUSTOMER(i + 1), business_id: B, full_name, phone, email, notes,
}));

await upsert("customers", customers);
console.log(`✓ ${customers.length} müşteri`);

// --- Rezervasyonlar ----------------------------------------------------------
// Ağustos 2026: 1 Ağustos Cumartesi. Düğünler hafta sonuna toplanıyor.
const perGuest = (name, guests) => {
  const p = pkg(name);
  return { package_id: p.id, unit_price: p.base_price, gross: p.base_price * guests };
};

const plan = [
  { n: 1,  c: 1,  date: "2026-08-01", venue: kir,   type: "dugun",    start: "19:00", end: "01:00", guests: 400, ...perGuest("Premium", 400), status: "tamamlandi", paid: "full" },
  { n: 2,  c: 2,  date: "2026-08-02", venue: nisan, type: "nisan",    start: "19:00", end: "23:00", guests: 120, gross: 45000,  status: "tamamlandi", paid: "full" },
  { n: 3,  c: 4,  date: "2026-08-07", venue: kir,   type: "kina",     start: "19:00", end: "23:30", guests: 250, gross: 35000,  status: "tamamlandi", paid: "full" },
  { n: 4,  c: 3,  date: "2026-08-08", venue: kir,   type: "dugun",    start: "19:00", end: "01:00", guests: 350, ...perGuest("Orta", 350), status: "tamamlandi", paid: "partial" },
  { n: 5,  c: 5,  date: "2026-08-09", venue: nisan, type: "soz",      start: "14:00", end: "17:00", guests: 80,  gross: 25000,  status: "tamamlandi", paid: "full" },
  { n: 6,  c: 6,  date: "2026-08-14", venue: nisan, type: "sunnet",   start: "12:00", end: "16:00", guests: 140, gross: 40000,  status: "tamamlandi", paid: "full" },
  { n: 7,  c: 7,  date: "2026-08-15", venue: kir,   type: "dugun",    start: "19:00", end: "01:00", guests: 450, ...perGuest("Premium", 450), status: "tamamlandi", paid: "full" },
  { n: 8,  c: 8,  date: "2026-08-16", venue: kir,   type: "davet",    start: "18:00", end: "22:00", guests: 200, gross: 55000,  status: "tamamlandi", paid: "partial" },
  { n: 9,  c: 10, date: "2026-08-21", venue: nisan, type: "nisan",    start: "19:00", end: "23:00", guests: 130, gross: 42000,  status: "iptal_edildi", paid: "none" },
  { n: 10, c: 3,  date: "2026-08-22", venue: kir,   type: "dugun",    start: "19:00", end: "01:00", guests: 380, ...perGuest("Orta", 380), status: "tamamlandi", paid: "full" },
  { n: 11, c: 4,  date: "2026-08-23", venue: nisan, type: "kina",     start: "19:00", end: "23:00", guests: 110, gross: 30000,  status: "tamamlandi", paid: "full" },
  { n: 12, c: 9,  date: "2026-08-29", venue: kir,   type: "dugun",    start: "19:00", end: "01:00", guests: 500, ...perGuest("Premium", 500), status: "tamamlandi", paid: "full" },
  { n: 13, c: 9,  date: "2026-08-30", venue: nisan, type: "kurumsal", start: "10:00", end: "16:00", guests: 100, gross: 60000,  status: "tamamlandi", paid: "partial" },
];

const minusDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

await upsert("reservations", plan.map((r) => ({
  id: RESERVATION(r.n), business_id: B, venue_id: r.venue.id, customer_id: CUSTOMER(r.c),
  package_id: r.package_id ?? null, organization_type: r.type, status: r.status,
  event_date: r.date, start_time: r.start, end_time: r.end, guest_count: r.guests,
  notes: null, created_by: owner.id,
})));

await upsert("reservation_pricing", plan.map((r) => ({
  reservation_id: RESERVATION(r.n), business_id: B,
  gross_amount: r.gross, discount_amount: 0,
  due_date: minusDays(r.date, 3), unit_price: r.unit_price ?? null,
})));
console.log(`✓ ${plan.length} rezervasyon (${plan.filter(r=>r.status==='iptal_edildi').length} iptal)`);

// --- Tahsilatlar -------------------------------------------------------------
// Kapora rezervasyondan ~45 gün önce, kalan ödeme organizasyon gününde.
const payments = [];
let pn = 0;
for (const r of plan) {
  if (r.paid === "none") continue;
  const deposit = Math.round(r.gross * 0.3);
  payments.push({
    id: PAYMENT(++pn), business_id: B, reservation_id: RESERVATION(r.n),
    customer_id: CUSTOMER(r.c), amount: deposit, payment_date: minusDays(r.date, 45),
    method: "nakit", category: "kapora", description: "Rezervasyon kaporası",
    created_by: owner.id,
  });
  if (r.paid === "full") {
    payments.push({
      id: PAYMENT(++pn), business_id: B, reservation_id: RESERVATION(r.n),
      customer_id: CUSTOMER(r.c), amount: r.gross - deposit, payment_date: r.date,
      method: r.n % 2 === 0 ? "havale_eft" : "kredi_karti", category: "son_odeme",
      description: "Organizasyon günü kalan ödeme", created_by: owner.id,
    });
  }
}
// Finansal kayıtlar değişmezdir (trigger tutar güncellemesini engeller),
// bu yüzden yeniden çalıştırmada güncellenmez; silinip yeniden yazılır.
await del(`payments?${demoRange()}`);
await upsert("payments", payments);
const collected = payments.reduce((s, p) => s + p.amount, 0);
console.log(`✓ ${payments.length} tahsilat · toplam ${collected.toLocaleString("tr-TR")} ₺`);

// --- Giderler ----------------------------------------------------------------
const expenses = [];
let en = 0;
const addExpense = (category, amount, date, description, reservationN, vendor) => {
  expenses.push({
    id: EXPENSE(++en), business_id: B, category_id: cat(category), amount,
    expense_date: date, method: "havale_eft", description, vendor: vendor ?? null,
    reservation_id: reservationN ? RESERVATION(reservationN) : null, created_by: owner.id,
  });
};

// Organizasyona bağlı giderler — kârlılık hesabına girer.
for (const r of plan) {
  if (r.status === "iptal_edildi") continue;
  addExpense("Catering", Math.round(r.gross * 0.22), r.date, `${r.guests} kişilik menü`, r.n, "Anadolu Catering");
  addExpense("Müzik", r.type === "dugun" ? 9000 : 5000, r.date, r.type === "dugun" ? "Orkestra" : "DJ", r.n, "Ritim Organizasyon");
  if (r.type === "dugun") addExpense("Fotoğraf", 12000, r.date, "Fotoğraf + video", r.n, "Kare Stüdyo");
  addExpense("Dekorasyon", Math.round(r.gross * 0.05), r.date, "Masa ve sahne süsleme", r.n, "Beyaz Dekor");
}

// Genel giderler — belirli bir organizasyona bağlı değil.
addExpense("Kira", 65000, "2026-08-05", "Ağustos kira", null, null);
addExpense("Personel", 95000, "2026-08-05", "Ağustos personel maaşları", null, null);
addExpense("Elektrik", 28500, "2026-08-12", "Elektrik ve doğalgaz", null, null);
addExpense("Temizlik", 14000, "2026-08-18", "Aylık temizlik hizmeti", null, "Parlak Temizlik");
addExpense("Reklam", 9500, "2026-08-20", "Sosyal medya reklamı", null, null);
addExpense("Bakım", 17500, "2026-08-25", "Klima bakımı", null, null);

await del(`expenses?${demoRange()}`);
await upsert("expenses", expenses);
const spent = expenses.reduce((s, e) => s + e.amount, 0);
console.log(`✓ ${expenses.length} gider · toplam ${spent.toLocaleString("tr-TR")} ₺`);

const sales = plan.filter((r) => r.status !== "iptal_edildi").reduce((s, r) => s + r.gross, 0);
console.log(`\nAğustos 2026 özeti`);
console.log(`  Satış      ${sales.toLocaleString("tr-TR")} ₺`);
console.log(`  Tahsilat   ${collected.toLocaleString("tr-TR")} ₺`);
console.log(`  Gider      ${spent.toLocaleString("tr-TR")} ₺`);
console.log(`  Kâr        ${(sales - spent).toLocaleString("tr-TR")} ₺  (%${Math.round((sales-spent)/sales*100)})`);
console.log(`\nSilmek için: node supabase/seed/demo.mjs --temizle\n`);
