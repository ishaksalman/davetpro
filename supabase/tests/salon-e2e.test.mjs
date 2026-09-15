/**
 * Salon işletmesinin uçtan uca akışı.
 *
 * schema.test.mjs kuralları tek tek doğruluyor; bu dosya bir salonun
 * gerçekte yaptığı işi baştan sona koşturuyor: kurulum → tanımlar → talep →
 * rezervasyon → tahsilat → gider → sözleşme → raporlar.
 *
 * Çağrılar uygulamanın kullandığı RPC ve görünümlerin AYNISI; imza değişirse
 * burada patlıyor. Gerçek PostgreSQL (PGlite) üzerinde, RLS açık, rol
 * 'authenticated'.
 */
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'node:fs'
import path from 'node:path'

const HERE = path.dirname(new URL(import.meta.url).pathname)
const MIG = path.join(HERE, '..', 'migrations')
const db = await PGlite.create({ extensions: { btree_gist, pgcrypto } })

let pass = 0, fail = 0
const ok = (m) => { pass++; console.log(`  \x1b[32m✓\x1b[0m ${m}`) }
const bad = (m, e) => { fail++; console.log(`  \x1b[31m✗\x1b[0m ${m}\n      ${e}`) }
async function step(name, fn) {
  try { await fn(); ok(name) } catch (e) { bad(name, e.message.split('\n')[0]) }
}
const esit = (a, b, ne) => {
  if (String(a) !== String(b)) throw new Error(`${ne}: ${b} bekleniyordu, ${a} geldi`)
}
// Para karşılaştırması: görünüm kimi durumda '0', kimi durumda '0.00' döndürüyor.
const para = (a, b, ne) => {
  if (Number(a) !== Number(b)) throw new Error(`${ne}: ${b} bekleniyordu, ${a} geldi`)
}

const UID = '11111111-1111-1111-1111-111111111111'
const q = (sql, p) => db.query(sql, p)
const tek = async (sql, p) => (await q(sql, p)).rows[0]

console.log('\n\x1b[1mSalon · uçtan uca\x1b[0m')

await db.exec(fs.readFileSync(path.join(HERE, 'supabase-stub.sql'), 'utf8'))
for (const f of fs.readdirSync(MIG).sort()) {
  await db.exec(fs.readFileSync(path.join(MIG, f), 'utf8'))
}
await q(`insert into auth.users (id, email) values ($1, 'salon@test.local')`, [UID])
await db.exec('set role authenticated')
await q(`select set_config('test.uid', $1, false)`, [UID])

// --- Kurulum -----------------------------------------------------------------

await step('işletme açılıyor (varsayılan tip: salon)', async () => {
  await q(`select create_business_with_owner('Gül Düğün Salonu', 'İshak')`)
  const b = await tek(`select business_type from businesses`)
  esit(b.business_type, 'salon', 'işletme tipi')
})

await step('gider kategorileri ve sözleşme şablonu hazır geliyor', async () => {
  const k = await tek(`select count(*)::int c from expense_categories`)
  if (k.c < 3) throw new Error(`kategori sayısı ${k.c}`)
  const t = await tek(`select body from contract_templates`)
  if (!t.body.includes('ORGANİZASYON')) throw new Error('salon şablonu değil')
  if (t.body.includes('TELİF')) throw new Error('fotoğrafçı maddesi sızmış')
})

await step('salonda ekip ve serbest alan YOK', async () => {
  esit((await tek(`select count(*)::int c from teams`)).c, 0, 'ekip sayısı')
  esit((await tek(`select count(*)::int c from venues where allows_overlap`)).c, 0, 'serbest alan')
})

let salon, salon2, musteri, paket
await step('salon, paket ve müşteri tanımlanıyor', async () => {
  salon = (await tek(`insert into venues (name, capacity) values ('Balo Salonu', 500) returning id`)).id
  salon2 = (await tek(`insert into venues (name, capacity) values ('Kır Bahçesi', 300) returning id`)).id
  paket = (await tek(
    `insert into packages (name, base_price, pricing_type, included_services)
     values ('Gold', 120000, 'sabit', array['Yemek','DJ']) returning id`)).id
  musteri = (await tek(
    `insert into customers (full_name, phone, contract_name, national_id)
     values ('Ayşe & Ahmet', '05001112233', 'Ahmet Salman', '12345678901') returning id`)).id
})

// --- Müsaitlik ---------------------------------------------------------------

await step('boş tarihte iki salon da müsait', async () => {
  const r = await q(`select venue_name, is_available from venue_availability('2027-06-06','14:00','20:00')`)
  esit(r.rows.length, 2, 'salon sayısı')
  if (!r.rows.every((x) => x.is_available)) throw new Error('boş tarihte dolu görünüyor')
})

// --- Rezervasyon -------------------------------------------------------------

let rez
await step('rezervasyon kaydediliyor (uygulamanın gönderdiği imza)', async () => {
  rez = (await tek(
    `select save_reservation(null,$1,$2,$3,'dugun','kesinlesti','2027-06-06','14:00','20:00',
            400,'Kapıda karşılama',120000,10000,'2027-05-20',null,null,null,null) id`,
    [musteri, salon, paket])).id
  const r = await tek(`select guest_count, status, location, team_id from reservations where id = $1`, [rez])
  esit(r.guest_count, 400, 'kişi sayısı')
  esit(r.status, 'kesinlesti', 'durum')
  if (r.location !== null) throw new Error('salonda etkinlik adresi dolmuş')
  if (r.team_id !== null) throw new Error('salonda ekip dolmuş')
})

await step('finans görünümü doğru hesaplıyor (brüt 120.000 − 10.000 indirim)', async () => {
  const f = await tek(`select gross_amount, discount_amount, net_amount, balance_amount
                         from reservation_financials where reservation_id = $1`, [rez])
  esit(f.gross_amount, '120000.00', 'brüt')
  esit(f.net_amount, '110000.00', 'net')
  esit(f.balance_amount, '110000.00', 'bakiye')
})

await step('aynı salonda çakışan saat ENGELLENİYOR', async () => {
  try {
    await q(`select save_reservation(null,$1,$2,null,'nisan','kesinlesti','2027-06-06','16:00','19:00',
                    null,null,50000,0,null,null,null,null,null)`, [musteri, salon])
    throw new Error('çakışan kayıt kabul edildi')
  } catch (e) {
    if (!/organizasyon var/i.test(e.message)) throw new Error(`mesaj beklenmedik: ${e.message}`)
    if (/çekim/i.test(e.message)) throw new Error('fotoğrafçı dili sızmış')
  }
})

await step('aynı saat FARKLI salonda serbest', async () => {
  await q(`select save_reservation(null,$1,$2,null,'nisan','kesinlesti','2027-06-06','16:00','19:00',
                  200,null,50000,0,null,null,null,null,null)`, [musteri, salon2])
  esit((await tek(`select count(*)::int c from reservations where event_date='2027-06-06'`)).c, 2, 'kayıt')
})

await step('dolu salon müsaitlikte engel olarak görünüyor', async () => {
  const r = await tek(
    `select is_available, severity, conflict_kind, conflict_label
       from venue_availability('2027-06-06','15:00','18:00') where venue_name = 'Balo Salonu'`)
  esit(r.is_available, false, 'müsaitlik')
  esit(r.severity, 'engel', 'seviye')
  esit(r.conflict_kind, 'rezervasyon', 'çakışma türü')
})

await step('yetersiz boşluk (1 saatten az) engelleniyor', async () => {
  try {
    await q(`select save_reservation(null,$1,$2,null,'kina','kesinlesti','2027-06-06','20:30','23:00',
                    null,null,30000,0,null,null,null,null,null)`, [musteri, salon])
    throw new Error('yetersiz boşluklu kayıt kabul edildi')
  } catch (e) {
    if (!/dakika/i.test(e.message)) throw new Error(`mesaj beklenmedik: ${e.message}`)
  }
})

// --- Tahsilat ve gider -------------------------------------------------------

await step('tahsilat giriliyor, bakiye düşüyor', async () => {
  await q(`insert into payments (reservation_id, amount, method, payment_date)
           values ($1, 40000, 'nakit', '2027-01-15')`, [rez])
  const f = await tek(`select collected_amount, balance_amount from reservation_financials
                        where reservation_id = $1`, [rez])
  esit(f.collected_amount, '40000.00', 'tahsilat')
  esit(f.balance_amount, '70000.00', 'bakiye')
})

await step('tahsilat DEĞİŞTİRİLEMİYOR', async () => {
  const p = await tek(`select id from payments limit 1`)
  if (!p) throw new Error('kurulum hatalı: tahsilat yok')
  for (const [ne, sql] of [
    ['güncelleme', `update payments set amount = 1 where id = $1`],
    ['silme', `delete from payments where id = $1`],
  ]) {
    try { await q(sql, [p.id]); throw new Error(`${ne} engellenmedi`) }
    catch (e) { if (/engellenmedi/.test(e.message)) throw e }
  }
})

await step('tahsilat iptali void ile yapılıyor', async () => {
  const p = await tek(`select id from payments limit 1`)
  await q(`update payments set voided_at = now(), void_reason = 'Yanlış kayıt' where id = $1`, [p.id])
  const f = await tek(`select collected_amount, balance_amount from reservation_financials
                        where reservation_id = $1`, [rez])
  para(f.collected_amount, 0, 'iptal sonrası tahsilat')
  para(f.balance_amount, 110000, 'iptal sonrası bakiye')
})

await step('organizasyona bağlı gider kârlılığa giriyor', async () => {
  const k = await tek(`select id from expense_categories limit 1`)
  await q(`insert into expenses (reservation_id, category_id, amount, expense_date, description)
           values ($1, $2, 15000, '2027-06-01', 'Catering')`, [rez, k.id])
  const f = await tek(`select expense_amount, profit_amount from reservation_financials
                        where reservation_id = $1`, [rez])
  esit(f.expense_amount, '15000.00', 'gider')
  esit(f.profit_amount, '95000.00', 'kâr')
})

// --- Sözleşme ----------------------------------------------------------------

await step('sözleşme oluşuyor, anlık görüntü doğru', async () => {
  // Uygulama gövdeyi ve anlık görüntüyü kendi kurup gönderiyor.
  const t = await tek(`select body from contract_templates limit 1`)
  const anlik = {
    business: { name: 'Gül Düğün Salonu', business_type: 'salon' },
    customer: { full_name: 'Ayşe & Ahmet', contract_name: 'Ahmet Salman' },
    organization: { venue_name: 'Balo Salonu', type: 'dugun' },
    finance: { net_amount: '110000.00' },
  }
  const c = await tek(`select (create_contract($1, $2, $3)).id`, [rez, t.body, anlik])
  const s = await tek(`select snapshot from contracts where id = $1`, [c.id])
  esit(s.snapshot.business.business_type, 'salon', 'anlık görüntü tipi')
  esit(s.snapshot.customer.contract_name ?? s.snapshot.customer.full_name, 'Ahmet Salman', 'sözleşme adı')
  esit(s.snapshot.organization.venue_name, 'Balo Salonu', 'salon adı')
})

// --- Talepler ----------------------------------------------------------------

await step('talep açılıp rezervasyona dönüşüyor', async () => {
  const l = await tek(
    `insert into leads (customer_id, venue_id, organization_type, event_date, guest_count)
     values ($1, $2, 'nisan', '2027-07-07', 150) returning id`, [musteri, salon])
  const r = await tek(
    `select convert_lead_to_reservation($1,null,$2,null,'2027-07-07','14:00','20:00',
            150,60000,0,null,null,null) id`, [l.id, salon])
  const x = await tek(`select status, event_date from reservations where id = $1`, [r.id])
  esit(x.status, 'kesinlesti', 'dönüşen durum')
})

// --- Raporlar ----------------------------------------------------------------

await step('rapor fonksiyonları çalışıyor', async () => {
  const f = await tek(`select * from finance_summary('2027-01-01','2027-12-31')`)
  if (Number(f.reservation_count) < 1) throw new Error('rezervasyon sayılmamış')
  for (const fn of ['type_breakdown', 'weekday_breakdown', 'package_breakdown', 'venue_performance']) {
    await q(`select * from ${fn}('2027-01-01','2027-12-31')`)
  }
  await q(`select * from monthly_series('2027-01-01','2027-12-31')`)
})

await step('müşteri bakiyesi görünümü çalışıyor', async () => {
  const r = await tek(`select * from customer_balances where customer_id = $1`, [musteri])
  if (r === undefined) throw new Error('bakiye satırı yok')
})

// --- Kiracı izolasyonu -------------------------------------------------------

await step('başka kiracı salonun verisini göremiyor', async () => {
  const U2 = '22222222-2222-2222-2222-222222222222'
  await db.exec('reset role')
  await q(`insert into auth.users (id, email) values ($1, 'other@test.local')`, [U2])
  await db.exec('set role authenticated')
  await q(`select set_config('test.uid', $1, false)`, [U2])
  await q(`select create_business_with_owner('Başka Salon', 'Biri')`)
  for (const t of ['reservations', 'customers', 'venues', 'payments', 'expenses', 'contracts']) {
    esit((await tek(`select count(*)::int c from ${t}`)).c, 0, `${t} sızıntısı`)
  }
  await q(`select set_config('test.uid', $1, false)`, [UID])
})

console.log(`\n\x1b[1mSonuç:\x1b[0m \x1b[32m${pass} geçti\x1b[0m` +
            (fail ? `, \x1b[31m${fail} başarısız\x1b[0m` : ', 0 başarısız'))
process.exit(fail ? 1 : 0)
