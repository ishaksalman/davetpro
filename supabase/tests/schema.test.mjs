import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'node:fs'
import path from 'node:path'

const HERE = path.dirname(new URL(import.meta.url).pathname)

const MIG = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'migrations')

const db = await PGlite.create({ extensions: { btree_gist, pgcrypto } })

let pass = 0, fail = 0
const ok = (m) => { pass++; console.log(`  \x1b[32m✓\x1b[0m ${m}`) }
const bad = (m, e) => { fail++; console.log(`  \x1b[31m✗\x1b[0m ${m}\n      ${e}`) }

async function step(name, fn) {
  try { await fn(); ok(name) } catch (e) { bad(name, e.message) }
}
// Bir işlemin HATA VERMESİ bekleniyor
async function expectFail(name, fn, match) {
  try { await fn(); bad(name, 'hata bekleniyordu, işlem başarılı oldu') }
  catch (e) {
    if (match && !e.message.includes(match)) bad(name, `beklenen mesaj "${match}" değil: ${e.message}`)
    else ok(`${name} (engellendi: ${e.message.slice(0, 60)}…)`)
  }
}

const as = async (uid) => {
  await db.exec('reset role')
  await db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
  await db.exec('set role authenticated')
}
const asSuper = async () => { await db.exec('reset role') }

console.log('\n\x1b[1m1) Migration\x1b[0m')
await step('supabase stub', () => db.exec(fs.readFileSync(path.join(HERE, 'supabase-stub.sql'), 'utf8')))
for (const f of fs.readdirSync(MIG).sort()) {
  await step(f, () => db.exec(fs.readFileSync(path.join(MIG, f), 'utf8')))
}
if (fail) { console.log('\nMigration başarısız, testler atlanıyor.'); process.exit(1) }

// --- Kullanıcılar ------------------------------------------------------------
const U = {
  ownerA: '11111111-1111-1111-1111-111111111111',
  ownerB: '22222222-2222-2222-2222-222222222222',
  staffA: '33333333-3333-3333-3333-333333333333',
}
await asSuper()
for (const [k, v] of Object.entries(U)) {
  await db.query('insert into auth.users (id, email) values ($1, $2)', [v, `${k}@test.local`])
}

console.log('\n\x1b[1m2) İşletme kurulumu\x1b[0m')
await as(U.ownerA)
await step('A işletmesi oluşturuldu', () => db.query(`select create_business_with_owner('Gül Düğün Salonu', 'Ayşe Yılmaz')`))
await as(U.ownerB)
await step('B işletmesi oluşturuldu', () => db.query(`select create_business_with_owner('Beyaz Balo Salonu', 'Mehmet Demir')`))
await as(U.ownerA)
await step('varsayılan 13 gider kategorisi kopyalandı', async () => {
  const r = await db.query('select count(*)::int n from expense_categories')
  if (r.rows[0].n !== 13) throw new Error(`13 bekleniyordu, ${r.rows[0].n} bulundu`)
})
await expectFail('aynı kullanıcı ikinci işletme açamaz',
  () => db.query(`select create_business_with_owner('İkinci', 'Ayşe')`), 'zaten bir işletmeye bağlı')

// --- A işletmesinin verisi ---------------------------------------------------
console.log('\n\x1b[1m3) Temel kayıtlar\x1b[0m')
await as(U.ownerA)
const bizA = (await db.query('select current_business_id() id')).rows[0].id
let venueA, custA, pkgA
await step('salon eklendi', async () => {
  venueA = (await db.query(`insert into venues (name, capacity) values ('Balo Salonu', 500) returning id`)).rows[0].id
})
await step('paket eklendi', async () => {
  pkgA = (await db.query(`insert into packages (name, base_price, included_services)
    values ('Gold Paket', 120000, array['Yemek','DJ','Fotoğraf']) returning id`)).rows[0].id
})
await step('müşteri eklendi', async () => {
  custA = (await db.query(`insert into customers (full_name, phone) values ('Zeynep & Ali', '05321112233') returning id`)).rows[0].id
})
await step('business_id varsayılanı otomatik doldu', async () => {
  const r = await db.query('select business_id from venues where id = $1', [venueA])
  if (r.rows[0].business_id !== bizA) throw new Error('business_id eşleşmedi')
})

console.log('\n\x1b[1m4) Rezervasyon + çakışma kontrolü\x1b[0m')
let resA
await step('rezervasyon kaydedildi (fiyatla birlikte)', async () => {
  resA = (await db.query(`select save_reservation(null, $1, $2, $3, 'dugun', 'kesinlesti',
    '2026-09-12', '19:00', '01:00', 400, 'Kına dahil', 120000, 0, '2026-09-01') id`,
    [custA, venueA, pkgA])).rows[0].id
})
await step('gece yarısını aşan bitiş doğru hesaplandı', async () => {
  const r = await db.query('select starts_at, ends_at from reservations where id = $1', [resA])
  const { starts_at, ends_at } = r.rows[0]
  if (!(ends_at > starts_at)) throw new Error(`ends_at (${ends_at}) > starts_at (${starts_at}) olmalı`)
})
await expectFail('aynı salonda çakışan saat reddedildi',
  () => db.query(`select save_reservation(null, $1, $2, null, 'nisan', 'kesinlesti',
    '2026-09-12', '22:00', '23:30', 100, null, 20000, 0, null)`, [custA, venueA]),
  'en az 60 dakika')
// EXCLUDE kısıtı, trigger devre dışı kalsa bile son savunma hattı olarak durmalı.
await step('reservations_no_overlap kısıtı hâlâ tanımlı', async () => {
  const r = await db.query(`select 1 from pg_constraint where conname = 'reservations_no_overlap'`)
  if (r.rows.length !== 1) throw new Error('EXCLUDE kısıtı kaybolmuş')
})
// Boşluk kuralı ayrı salon ve ayrı yılda: finans fikstürlerini kirletmesin.
await step('60 dakikadan az boşluk reddedilir, tam 60 kabul edilir', async () => {
  const v = (await db.query(
    `insert into venues (name) values ('Boşluk Salonu') returning id`)).rows[0].id
  await db.query(`select save_reservation(null, $1, $2, null, 'dugun', 'kesinlesti',
    '2029-04-10', '13:00', '17:00', 100, null, 30000, 0, null)`, [custA, v])

  let reddedildi = false
  try {
    await db.query(`select save_reservation(null, $1, $2, null, 'nisan', 'kesinlesti',
      '2029-04-10', '17:30', '21:00', 100, null, 30000, 0, null)`, [custA, v])
  } catch (e) {
    reddedildi = /en az 60 dakika/.test(e.message)
  }
  if (!reddedildi) throw new Error('30 dakikalık boşluk kabul edildi')

  await db.query(`select save_reservation(null, $1, $2, null, 'nisan', 'kesinlesti',
    '2029-04-10', '18:00', '21:00', 100, null, 30000, 0, null)`, [custA, v])
})
await step('60-120 dakika arası engel değil, uyarı', async () => {
  const v = (await db.query(
    `insert into venues (name) values ('Uyarı Salonu') returning id`)).rows[0].id
  await db.query(`select save_reservation(null, $1, $2, null, 'dugun', 'kesinlesti',
    '2029-07-07', '13:00', '17:00', 100, null, 30000, 0, null)`, [custA, v])

  // 90 dakika boşluk: kaydedilebilmeli ama uyarı dönmeli.
  const a = await db.query(
    `select severity, gap_minutes, is_available from venue_availability('2029-07-07','18:30','22:00',null)
      where venue_id = $1`, [v])
  const row = a.rows[0]
  if (row.severity !== 'uyari') throw new Error('uyarı beklendi: ' + row.severity)
  if (row.gap_minutes !== 90) throw new Error('boşluk 90 olmalı: ' + row.gap_minutes)
  if (!row.is_available) throw new Error('uyarı kaydı engellememeli')

  await db.query(`select save_reservation(null, $1, $2, null, 'nisan', 'kesinlesti',
    '2029-07-07', '18:30', '22:00', 100, null, 30000, 0, null)`, [custA, v])
})
await step('120 dakikadan geniş boşlukta uyarı yok', async () => {
  const v = (await db.query(
    `insert into venues (name) values ('Geniş Salon') returning id`)).rows[0].id
  await db.query(`select save_reservation(null, $1, $2, null, 'dugun', 'kesinlesti',
    '2029-08-08', '10:00', '14:00', 100, null, 30000, 0, null)`, [custA, v])
  const a = await db.query(
    `select severity, is_available from venue_availability('2029-08-08','19:00','23:00',null)
      where venue_id = $1`, [v])
  if (a.rows[0].severity !== null) throw new Error('uyarı çıkmamalı: ' + a.rows[0].severity)
  if (!a.rows[0].is_available) throw new Error('müsait olmalı')
})
await step('boşluk eşikleri tek yerde ve beklenen değerde', async () => {
  const r = await db.query(`select min_gap_minutes() as min, warn_gap_minutes() as warn`)
  const { min, warn } = r.rows[0]
  if (min !== 60) throw new Error('asgari boşluk 60 olmalı: ' + min)
  if (warn !== 120) throw new Error('uyarı eşiği 120 olmalı: ' + warn)
  if (!(warn > min)) throw new Error('uyarı eşiği asgariden büyük olmalı')
})
await step('çakışmayan saat kabul edildi', () => db.query(
  `select save_reservation(null, $1, $2, null, 'nisan', 'kesinlesti',
    '2026-09-12', '12:00', '16:00', 100, null, 20000, 0, null)`, [custA, venueA]))
await step('iptal edilen rezervasyon çakışma engeline takılmaz', async () => {
  await db.query(`update reservations set status = 'iptal_edildi' where event_date = '2026-09-12' and start_time = '12:00'`)
  await db.query(`select save_reservation(null, $1, $2, null, 'kina', 'kesinlesti',
    '2026-09-12', '13:00', '15:00', 80, null, 15000, 0, null)`, [custA, venueA])
})

console.log('\n\x1b[1m5) Tenant izolasyonu\x1b[0m')
await as(U.ownerB)
await step('B, A\'nın müşterilerini göremez', async () => {
  const r = await db.query('select count(*)::int n from customers')
  if (r.rows[0].n !== 0) throw new Error(`0 bekleniyordu, ${r.rows[0].n} görüldü`)
})
await step('B, A\'nın rezervasyonlarını göremez', async () => {
  const r = await db.query('select count(*)::int n from reservations')
  if (r.rows[0].n !== 0) throw new Error(`0 bekleniyordu, ${r.rows[0].n} görüldü`)
})
await step('B, A\'nın tahsilat/fiyat kayıtlarını göremez', async () => {
  const r = await db.query('select count(*)::int n from reservation_financials')
  if (r.rows[0].n !== 0) throw new Error(`0 bekleniyordu, ${r.rows[0].n} görüldü`)
})
await expectFail('B, A\'nın salonuna rezervasyon yazamaz', async () => {
  const c = (await db.query(`insert into customers (full_name, phone) values ('Test B', '05300000000') returning id`)).rows[0].id
  await db.query(`select save_reservation(null, $1, $2, null, 'dugun', 'kesinlesti',
    '2026-10-01', '19:00', '23:00', 100, null, 10000, 0, null)`, [c, venueA])
})
await step('B, A\'nın rezervasyonunu ID ile güncelleyemez (0 satır)', async () => {
  const r = await db.query(`update reservations set notes = 'ele geçirildi' where id = $1`, [resA])
  if (r.affectedRows !== 0) throw new Error(`${r.affectedRows} satır güncellendi`)
})

console.log('\n\x1b[1m6) Tahsilat ve finansal tutarlılık\x1b[0m')
await as(U.ownerA)
await step('1. ödeme 30.000 ₺', () => db.query(
  `insert into payments (reservation_id, customer_id, amount, category, method)
   values ($1, $2, 30000, 'kapora', 'nakit')`, [resA, custA]))
await step('2. ödeme 50.000 ₺', () => db.query(
  `insert into payments (reservation_id, customer_id, amount, category, method)
   values ($1, $2, 50000, 'ara_odeme', 'havale_eft')`, [resA, custA]))
await step('kalan tutar otomatik 40.000 ₺', async () => {
  const r = await db.query('select collected_amount, balance_amount from reservation_financials where reservation_id = $1', [resA])
  const { collected_amount, balance_amount } = r.rows[0]
  if (Number(collected_amount) !== 80000 || Number(balance_amount) !== 40000)
    throw new Error(`tahsil ${collected_amount}, kalan ${balance_amount}`)
})
await expectFail('net satışı aşan tahsilat reddedildi',
  () => db.query(`insert into payments (reservation_id, amount) values ($1, 50000)`, [resA]),
  'aşamaz')
await expectFail('ödeme tutarı sonradan değiştirilemez',
  () => db.query(`update payments set amount = 999 where reservation_id = $1 and amount = 30000`, [resA]),
  'değiştirilemez')
await expectFail('ödeme silinemez (sadece iptal)',
  () => db.query(`delete from payments where reservation_id = $1`, [resA]),
  'permission denied')
await step('ödeme iptal edilebilir ve bakiye güncellenir', async () => {
  await db.query(`update payments set voided_at = now(), void_reason = 'Yanlış tutar girildi'
                  where reservation_id = $1 and amount = 30000`, [resA])
  const r = await db.query('select collected_amount, balance_amount from reservation_financials where reservation_id = $1', [resA])
  if (Number(r.rows[0].collected_amount) !== 50000 || Number(r.rows[0].balance_amount) !== 70000)
    throw new Error(`tahsil ${r.rows[0].collected_amount}, kalan ${r.rows[0].balance_amount}`)
})
await expectFail('iptal edilmiş kayıt tekrar değiştirilemez',
  () => db.query(`update payments set description = 'x' where reservation_id = $1 and voided_at is not null`, [resA]),
  'İptal edilmiş')
// package_amount da güncelleniyor: 0030'dan beri brüt = paket + kalemler
// kısıtı var, yalnızca brütü değiştirmek o kısıta takılıp asıl sınanan
// korumaya hiç ulaşmıyordu.
await expectFail('net satış, tahsil edilenin altına indirilemez',
  () => db.query(
    `update reservation_pricing set package_amount = 10000, gross_amount = 10000
      where reservation_id = $1`, [resA]),
  'altına indirilemez')

console.log('\n\x1b[1m7) Kârlılık\x1b[0m')
await step('organizasyona gider bağlandı, kâr hesaplandı', async () => {
  const cat = (await db.query(`select id from expense_categories where name = 'Catering / Yemek'`)).rows[0].id
  await db.query(`insert into expenses (category_id, reservation_id, amount, expense_date, description)
                  values ($1, $2, 51000, '2026-09-12', 'Yemek')`, [cat, resA])
  const r = await db.query('select net_amount, expense_amount, profit_amount, profit_margin from reservation_financials where reservation_id = $1', [resA])
  const row = r.rows[0]
  if (Number(row.profit_amount) !== 69000) throw new Error(`kâr ${row.profit_amount}`)
  if (Number(row.profit_margin) !== 57.5) throw new Error(`marj ${row.profit_margin}`)
})

console.log('\n\x1b[1m8) Rol bazlı finans kısıtı\x1b[0m')
await asSuper()
await db.query(`insert into profiles (id, business_id, full_name, role, can_view_finance)
                values ($1, $2, 'Fatma Personel', 'staff', false)`, [U.staffA, bizA])
await as(U.staffA)
await step('personel rezervasyonları görebiliyor', async () => {
  const r = await db.query('select count(*)::int n from reservations')
  if (r.rows[0].n === 0) throw new Error('rezervasyon görünmüyor')
})
await step('personel tahsilatları göremiyor', async () => {
  const r = await db.query('select count(*)::int n from payments')
  if (r.rows[0].n !== 0) throw new Error(`${r.rows[0].n} kayıt sızdı`)
})
await step('personel fiyat bilgisini göremiyor', async () => {
  const r = await db.query('select net_amount from reservation_financials where reservation_id = $1', [resA])
  if (Number(r.rows[0].net_amount) !== 0) throw new Error(`fiyat sızdı: ${r.rows[0].net_amount}`)
})
await expectFail('personel kendi rolünü yükseltemez',
  () => db.query(`update profiles set role = 'owner' where id = $1`, [U.staffA]),
  'yönetici olmanız gerekir')
await step('personel rezervasyon oluşturabilir (fiyatsız)', () => db.query(
  `select save_reservation(null, $1, $2, null, 'davet', 'kesinlesti',
   '2026-11-05', '18:00', '22:00', 150, 'Personel kaydı', 50000, 0, null)`, [custA, venueA]))
await as(U.ownerA)
await step('personelin girdiği kayıtta fiyat yazılmamış', async () => {
  const r = await db.query(`select net_amount from reservation_financials where event_date = '2026-11-05'`)
  if (Number(r.rows[0].net_amount) !== 0) throw new Error('fiyat yazılmış olmamalıydı')
})
await asSuper()
await db.query(`update profiles set can_view_finance = true where id = $1`, [U.staffA])
await as(U.staffA)
await step('yetki verilince personel finansı görüyor', async () => {
  const r = await db.query('select count(*)::int n from payments')
  if (r.rows[0].n === 0) throw new Error('hâlâ göremiyor')
})

await step('paket silinince rezervasyon korunur, bağlantı kopar', async () => {
  const pkg = (await db.query(`insert into packages (name, base_price) values ('Silinecek Paket', 5000) returning id`)).rows[0].id
  await db.query(`update reservations set package_id = $1 where id = $2`, [pkg, resA])
  await db.query(`delete from packages where id = $1`, [pkg])
  const r = await db.query('select package_id, business_id from reservations where id = $1', [resA])
  if (r.rows[0].package_id !== null) throw new Error('package_id null olmalıydı')
  if (r.rows[0].business_id === null) throw new Error('business_id null yapılmış!')
})

console.log('\n\x1b[1m8b) Kişi başı fiyatlandırma\x1b[0m')
await as(U.ownerA)
await step('kişi başı fiyat rezervasyona yazılıyor', async () => {
  const id = (await db.query(`select save_reservation(null, $1, $2, null, 'davet', 'kesinlesti',
    '2026-12-20', '18:00', '23:00', 200, null, 170000, 0, null, 850) id`, [custA, venueA])).rows[0].id
  const r = await db.query('select gross_amount, unit_price from reservation_pricing where reservation_id = $1', [id])
  if (Number(r.rows[0].gross_amount) !== 170000) throw new Error(`toplam ${r.rows[0].gross_amount}`)
  if (Number(r.rows[0].unit_price) !== 850) throw new Error(`birim ${r.rows[0].unit_price}`)
  const v = await db.query('select unit_price from reservation_financials where reservation_id = $1', [id])
  if (Number(v.rows[0].unit_price) !== 850) throw new Error('view birim fiyatı göstermiyor')
})
await step('sabit fiyatta birim fiyat null kalır', async () => {
  const r = await db.query('select unit_price from reservation_pricing where reservation_id = $1', [resA])
  if (r.rows[0].unit_price !== null) throw new Error('null olmalıydı')
})
await step('paket varsayılan olarak sabit fiyatlı', async () => {
  const r = await db.query(`select pricing_type from packages where id = $1`, [pkgA])
  if (r.rows[0].pricing_type !== 'sabit') throw new Error(r.rows[0].pricing_type)
})
await step('paket kişi başına çevrilebiliyor', async () => {
  await db.query(`update packages set pricing_type = 'kisi_basi', base_price = 850 where id = $1`, [pkgA])
  const r = await db.query(`select pricing_type, base_price from packages where id = $1`, [pkgA])
  if (r.rows[0].pricing_type !== 'kisi_basi') throw new Error('güncellenmedi')
})

console.log('\n\x1b[1m9) View kolon sözleşmesi\x1b[0m')
// Uygulama bu kolon adlarına göre filtre uyguluyor. Ad değişirse PostgREST
// 400 döner ve tutarlar sessizce ₺0 görünebilir — bu yüzden sabitliyoruz.
const VIEW_COLUMNS = {
  reservation_financials: [
    'reservation_id', 'business_id', 'venue_id', 'customer_id', 'package_id',
    'event_date', 'status', 'organization_type', 'gross_amount', 'discount_amount',
    'net_amount', 'due_date', 'collected_amount', 'balance_amount',
    'expense_amount', 'profit_amount', 'profit_margin', 'unit_price',
    'package_amount', 'extras_amount',
  ],
  customer_balances: [
    'customer_id', 'business_id', 'reservation_count', 'total_sales',
    'total_paid', 'total_balance', 'last_event_date',
  ],
}
await asSuper()
for (const [view, expected] of Object.entries(VIEW_COLUMNS)) {
  await step(`${view} kolonları beklenenle birebir`, async () => {
    const r = await db.query(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = $1 order by column_name`, [view])
    const actual = r.rows.map((x) => x.column_name).sort()
    const want = [...expected].sort()
    const missing = want.filter((c) => !actual.includes(c))
    const extra = actual.filter((c) => !want.includes(c))
    if (missing.length || extra.length) {
      throw new Error(`eksik: [${missing}] · fazla: [${extra}]`)
    }
  })
}
await as(U.ownerA)

console.log('\n\x1b[1m10) Rapor RPC\'leri\x1b[0m')
await as(U.ownerA)
for (const fn of ['finance_summary', 'monthly_series', 'venue_performance', 'type_breakdown', 'package_breakdown', 'weekday_breakdown']) {
  await step(`${fn}()`, () => db.query(`select * from ${fn}('2026-01-01', '2026-12-31')`))
}
await step('finance_summary rakamları doğru', async () => {
  const r = await db.query(`select * from finance_summary('2026-09-01', '2026-09-30')`)
  const s = r.rows[0]
  // 12 Eylül: 120.000 (kesinleşti) + 15.000 (kına) = 135.000 satış, iptal hariç
  if (Number(s.total_sales) !== 135000) throw new Error(`satış ${s.total_sales}`)
  if (Number(s.total_expenses) !== 51000) throw new Error(`gider ${s.total_expenses}`)
  if (Number(s.reservation_count) !== 2) throw new Error(`adet ${s.reservation_count}`)
})
await step('boş dönemde finance_summary tek satır sıfır döner', async () => {
  const r = await db.query(`select * from finance_summary('2030-01-01', '2030-01-31')`)
  if (r.rows.length !== 1) throw new Error(`${r.rows.length} satır döndü`)
  if (Number(r.rows[0].total_sales) !== 0 || Number(r.rows[0].reservation_count) !== 0)
    throw new Error('sıfır beklenirken ' + JSON.stringify(r.rows[0]))
})
await step('customer_balances çalışıyor', async () => {
  const r = await db.query('select * from customer_balances where customer_id = $1', [custA])
  if (!r.rows.length) throw new Error('satır yok')
})

console.log('\n\x1b[1m11) Dış kaynaklı talepler (DavetMekanı)\x1b[0m')

// Entegrasyon uç noktası service_role ile çağırıyor; testte superuser bağlamı.
await asSuper()

const extBizA = (await db.query('select business_id from profiles where id = $1', [U.ownerA])).rows[0].business_id
const EXT = 'davetmekani'
let dis1

await step('dış talep müşteri ve lead oluşturuyor', async () => {
  const r = await db.query(
    `select upsert_external_lead($1, $2, $3, $4, $5, $6, null, 'dugun'::organization_type,
                                 $7::date, 320, $8) as r`,
    [extBizA, EXT, 'inq-1', 'Ayşe Yılmaz', '05321112233', 'ayse@ornek.com',
     '2027-06-12', 'Haziran için müsaitlik sorusu.'])
  dis1 = r.rows[0].r
  if (dis1.created !== true) throw new Error(JSON.stringify(dis1))
  const lead = (await db.query('select status, source, external_source, external_id from leads where id = $1', [dis1.lead_id])).rows[0]
  if (lead.status !== 'yeni') throw new Error(`durum ${lead.status}`)
  if (lead.source !== 'web') throw new Error(`kaynak ${lead.source}`)
  if (lead.external_source !== EXT || lead.external_id !== 'inq-1') throw new Error('external ref yazılmadı')
})

await step('aynı external_id ikinci kez lead ÜRETMİYOR', async () => {
  const once = (await db.query('select count(*)::int n from leads')).rows[0].n
  const r = await db.query(
    `select upsert_external_lead($1, $2, $3, $4, $5, null, null, 'dugun'::organization_type,
                                 null, null, null) as r`,
    [extBizA, EXT, 'inq-1', 'Ayşe Yılmaz', '05321112233'])
  if (r.rows[0].r.created !== false) throw new Error('ikinci kez created:true döndü')
  if (r.rows[0].r.lead_id !== dis1.lead_id) throw new Error('farklı lead döndü')
  const sonra = (await db.query('select count(*)::int n from leads')).rows[0].n
  if (sonra !== once) throw new Error(`lead sayısı ${once} → ${sonra}`)
})

// Aktarımdan sonra DavetPro tarafında yapılan çalışma korunmalı; tekrar
// gönderim (retry ya da geçmiş backfill'in ikinci kez koşması) ezmemeli.
// NOT: `status` elle 'teklif_verildi' yapılamıyor — DavetPro'da bu durum
// teklif oluşturulunca kendiliğinden ilerliyor (0015). O yüzden elle
// düzenlenebilen alanlarla sınıyoruz.
await step('DavetPro tarafındaki düzenleme ezilmiyor', async () => {
  await db.query(
    `update leads set notes = 'Aradım, alan gezisi ayarlandı', next_follow_up_at = now() + interval '2 days'
      where id = $1`, [dis1.lead_id])
  await db.query(
    `select upsert_external_lead($1, $2, $3, $4, $5, null, null, 'dugun'::organization_type,
                                 null, null, 'ESKİ NOT') as r`,
    [extBizA, EXT, 'inq-1', 'Ayşe Yılmaz', '05321112233'])
  const lead = (await db.query('select notes, next_follow_up_at from leads where id = $1', [dis1.lead_id])).rows[0]
  if (lead.notes !== 'Aradım, alan gezisi ayarlandı') throw new Error(`not ezildi: ${lead.notes}`)
  if (!lead.next_follow_up_at) throw new Error('takip tarihi silindi')
})

await step('aynı telefon ikinci müşteri kaydı üretmiyor', async () => {
  const once = (await db.query('select count(*)::int n from customers where business_id = $1', [extBizA])).rows[0].n
  await db.query(
    `select upsert_external_lead($1, $2, $3, $4, $5, null, null, 'nisan'::organization_type,
                                 null, 180, null) as r`,
    [extBizA, EXT, 'inq-2', 'Ayşe Yılmaz', '05321112233'])
  const sonra = (await db.query('select count(*)::int n from customers where business_id = $1', [extBizA])).rows[0].n
  if (sonra !== once) throw new Error(`müşteri sayısı ${once} → ${sonra}`)
})

await step('yarım external referans reddediliyor', async () => {
  try {
    await db.query(
      `insert into leads (business_id, customer_id, organization_type, external_source)
       select $1, id, 'dugun', 'davetmekani' from customers where business_id = $1 limit 1`, [extBizA])
    throw new Error('kısıt engellemedi')
  } catch (e) {
    if (!e.message.includes('leads_external_ref_complete')) throw e
  }
})

await step('business_id olmadan çalışmıyor', async () => {
  try {
    await db.query(
      `select upsert_external_lead(null, $1, 'inq-x', 'Test', '05001112233') as r`, [EXT])
    throw new Error('null business_id kabul edildi')
  } catch (e) {
    if (!e.message.includes('business_id zorunlu')) throw e
  }
})

await step('anon ve authenticated fonksiyonu çağıramıyor', async () => {
  await as(U.ownerA)
  try {
    await db.query(
      `select upsert_external_lead($1, 'x', 'y', 'Test', '05001112233') as r`, [extBizA])
    throw new Error('authenticated çağırabildi')
  } catch (e) {
    if (!e.message.includes('permission denied')) throw e
  }
  await asSuper()
})

console.log('\n\x1b[1m12) Bağlama kodları\x1b[0m')

await as(U.ownerA)
let kod

await step('sahip bağlama kodu üretebiliyor', async () => {
  const r = await db.query('select * from generate_integration_link_code(null)')
  kod = r.rows[0].link_code
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(kod)) throw new Error(`kod biçimi: ${kod}`)
  if (new Date(r.rows[0].valid_until) <= new Date()) throw new Error('süresi geçmiş kod')
})

await step('yeni kod üretmek eskisini geçersiz kılıyor', async () => {
  const eski = kod
  const r = await db.query('select * from generate_integration_link_code(null)')
  kod = r.rows[0].link_code
  if (kod === eski) throw new Error('aynı kod döndü')
  await asSuper()
  const tuketim = await db.query('select consume_integration_link_code($1) as r', [eski])
  await as(U.ownerA)
  if (tuketim.rows[0].r.ok !== false) throw new Error('eski kod hâlâ geçerli')
})

await step('kendi işletmesinde olmayan salon için kod üretilemiyor', async () => {
  try {
    await db.query('select * from generate_integration_link_code($1)',
      ['00000000-0000-4000-8000-000000000000'])
    throw new Error('yabancı salon kabul edildi')
  } catch (e) {
    if (!e.message.includes('bu işletmeye ait değil')) throw e
  }
})

await asSuper()
await step('kod tüketilince işletme bilgisi dönüyor', async () => {
  const r = await db.query('select consume_integration_link_code($1) as r', [kod])
  const s2 = r.rows[0].r
  if (s2.ok !== true) throw new Error(JSON.stringify(s2))
  if (!s2.business_id || !s2.business_name) throw new Error('işletme bilgisi eksik')
})

await step('kod TEK KULLANIMLIK', async () => {
  const r = await db.query('select consume_integration_link_code($1) as r', [kod])
  if (r.rows[0].r.reason !== 'already_used') throw new Error(JSON.stringify(r.rows[0].r))
})

await step('olmayan kod reddediliyor', async () => {
  const r = await db.query("select consume_integration_link_code('ZZZZZZ') as r")
  if (r.rows[0].r.reason !== 'not_found') throw new Error(JSON.stringify(r.rows[0].r))
})

await step('authenticated kod tüketemiyor', async () => {
  await as(U.ownerA)
  try {
    await db.query("select consume_integration_link_code('ABCDEF') as r")
    throw new Error('authenticated tüketebildi')
  } catch (e) {
    if (!e.message.includes('permission denied')) throw e
  }
  await asSuper()
})

console.log('\n\x1b[1m13) Abonelik ve deneme süresi\x1b[0m')

// Platform yöneticisi e-posta ile tanımlanıyor; testte o adresle bir kullanıcı
// açıp kendi işletmesini kuruyoruz.
const U_ADMIN = '44444444-4444-4444-4444-444444444444'
await asSuper()
await db.query(`insert into auth.users (id, email) values ($1, 'ishakslmn@gmail.com')`, [U_ADMIN])
await as(U_ADMIN)
await step('platform yöneticisi işletmesi açıldı', () =>
  db.query(`select create_business_with_owner('Platform Salonu', 'Ishak')`))

await step('yeni işletmeye otomatik abonelik açılıyor', async () => {
  await asSuper()
  const r = await db.query(`select count(*)::int c from subscriptions`)
  const b = await db.query(`select count(*)::int c from businesses`)
  if (r.rows[0].c !== b.rows[0].c) {
    throw new Error(`abonelik ${r.rows[0].c}, işletme ${b.rows[0].c}`)
  }
})

await step('deneme süresi trial_days() kadar ve access_until ile eşit', async () => {
  const r = await db.query(`
    select round(extract(epoch from (trial_ends_at - created_at)) / 86400) gun,
           (access_until = trial_ends_at) esit
    from subscriptions limit 1`)
  const { gun, esit } = r.rows[0]
  if (Number(gun) !== 30) throw new Error(`deneme ${gun} gün`)
  if (!esit) throw new Error('access_until deneme bitişinden farklı')
})

await step('referans kodları tekil', async () => {
  const r = await db.query(`
    select count(*)::int t, count(distinct reference_code)::int d from subscriptions`)
  if (r.rows[0].t !== r.rows[0].d) throw new Error('mükerrer referans kodu')
})

await step('kiracı yalnızca kendi aboneliğini görüyor', async () => {
  await as(U.ownerA)
  const r = await db.query('select count(*)::int c from subscriptions')
  if (r.rows[0].c !== 1) throw new Error(`${r.rows[0].c} satır görüyor`)
})

// Yönetici de tablodan TEK satır görmeli: oturum açılışı bu tabloyu
// maybeSingle() ile okuyor, çok satır dönerse yöneticinin hesabı açılmaz.
await step('platform yöneticisi de tablodan tek satır görüyor', async () => {
  await as(U_ADMIN)
  const r = await db.query('select count(*)::int c from subscriptions')
  if (r.rows[0].c !== 1) throw new Error(`${r.rows[0].c} satır görüyor`)
})

await expectFail('kiracı kendi süresini uzatamıyor', async () => {
  await as(U.ownerA)
  await db.query(`update subscriptions set access_until = now() + interval '99 years'`)
}, 'permission denied')

await expectFail('kiracı abonelik satırı ekleyemiyor', async () => {
  await as(U.ownerA)
  await db.query(`insert into subscriptions (business_id, trial_ends_at, access_until, reference_code)
                  values (current_business_id(), now(), now() + interval '9 years', 'DP-XXXX')`)
}, 'permission denied')

await step('is_platform_admin yalnızca listedeki e-postaya true', async () => {
  await as(U_ADMIN)
  const a = await db.query('select is_platform_admin() v')
  await as(U.ownerA)
  const b = await db.query('select is_platform_admin() v')
  if (a.rows[0].v !== true || b.rows[0].v !== false) {
    throw new Error(`admin=${a.rows[0].v}, kiracı=${b.rows[0].v}`)
  }
})

await expectFail('kiracı admin_extend_access çağıramıyor', async () => {
  await as(U.ownerA)
  await db.query(`select admin_extend_access(current_business_id(), 30)`)
}, 'platform yöneticisi')

await expectFail('kiracı admin_businesses çağıramıyor', async () => {
  await as(U.ownerA)
  await db.query(`select * from admin_businesses()`)
}, 'platform yöneticisi')

await step('admin_businesses salon sayısını da veriyor', async () => {
  await asSuper()
  const bid = (await db.query(
    `select id from businesses where name = 'Gül Düğün Salonu'`)).rows[0].id
  const beklenen = (await db.query(
    `select count(*)::int c from venues where business_id = $1 and is_active`,
    [bid])).rows[0].c
  await as(U_ADMIN)
  const r = await db.query(
    `select venue_count from admin_businesses() where business_id = $1`, [bid])
  if (r.rows[0].venue_count !== beklenen) {
    throw new Error(`${r.rows[0].venue_count} yazıyor, ${beklenen} olmalı`)
  }
})

await step('admin_businesses tüm işletmeleri sahibiyle listeliyor', async () => {
  await as(U_ADMIN)
  const r = await db.query(`select business_name, owner_email from admin_businesses()`)
  await asSuper()
  const toplam = (await db.query('select count(*)::int c from businesses')).rows[0].c
  if (r.rows.length !== toplam) throw new Error(`${r.rows.length} satır, ${toplam} işletme`)
  if (r.rows.some((x) => !x.owner_email)) throw new Error('sahip e-postası boş')
})

// Bu davranış elle uzatmanın en kolay yanlış yapılan yeri: süresi geçmiş bir
// hesapta access_until + gün hâlâ geçmişte kalır.
await step('süresi dolmuş hesapta eklenen gün BUGÜNDEN başlıyor', async () => {
  await asSuper()
  const bid = (await db.query(
    `select business_id from subscriptions s join businesses b on b.id = s.business_id
     where b.name = 'Gül Düğün Salonu'`)).rows[0].business_id
  await db.query(
    `update subscriptions set access_until = now() - interval '10 days' where business_id = $1`,
    [bid])
  await as(U_ADMIN)
  await db.query(`select admin_extend_access($1, 30, 'havale 12.09')`, [bid])
  await asSuper()
  const r = await db.query(
    `select round(extract(epoch from (access_until - now())) / 86400) gun, note
     from subscriptions where business_id = $1`, [bid])
  if (Number(r.rows[0].gun) !== 30) throw new Error(`kalan ${r.rows[0].gun} gün`)
  if (r.rows[0].note !== 'havale 12.09') throw new Error('not yazılmadı')
})

await step('süresi devam eden hesapta mevcut bitişin üstüne ekleniyor', async () => {
  await asSuper()
  const bid = (await db.query(
    `select business_id from subscriptions s join businesses b on b.id = s.business_id
     where b.name = 'Gül Düğün Salonu'`)).rows[0].business_id
  await as(U_ADMIN)
  await db.query(`select admin_extend_access($1, 30)`, [bid])
  await asSuper()
  const r = await db.query(
    `select round(extract(epoch from (access_until - now())) / 86400) gun, note
     from subscriptions where business_id = $1`, [bid])
  if (Number(r.rows[0].gun) !== 60) throw new Error(`kalan ${r.rows[0].gun} gün`)
  // Not gönderilmediğinde eskisi korunmalı, null'a düşmemeli.
  if (r.rows[0].note !== 'havale 12.09') throw new Error('not silindi')
})

for (const gun of [0, -5, 4000]) {
  await expectFail(`${gun} gün reddediliyor`, async () => {
    await as(U_ADMIN)
    const bid = (await db.query(`select business_id from subscriptions limit 1`)).rows[0].business_id
    await db.query(`select admin_extend_access($1, $2)`, [bid, gun])
  })
}

await expectFail('olmayan işletme reddediliyor', async () => {
  await as(U_ADMIN)
  await db.query(`select admin_extend_access('00000000-0000-0000-0000-000000000000', 30)`)
}, 'bulunamadı')

await step('işletme silinince abonelik de siliniyor', async () => {
  await asSuper()
  const once = (await db.query('select count(*)::int c from subscriptions')).rows[0].c
  await db.query(`delete from businesses where name = 'Platform Salonu'`)
  const sonra = (await db.query('select count(*)::int c from subscriptions')).rows[0].c
  if (sonra !== once - 1) throw new Error(`${once} → ${sonra}`)
})

console.log('\n\x1b[1m14) Müsaitlik: düzenlenen rezervasyonu atlama\x1b[0m')

await as(U.ownerA)
const MV = (await db.query(`insert into venues (name) values ('Müsaitlik Salonu') returning id`)).rows[0].id
const MC1 = (await db.query(`insert into customers (full_name, phone) values ('Elif & Serkan','05001110001') returning id`)).rows[0].id
const MC2 = (await db.query(`insert into customers (full_name, phone) values ('Ayşe & Can','05001110002') returning id`)).rows[0].id

const MR = (await db.query(
  `select save_reservation(null,$1,$2,null,'dugun','kesinlesti','2027-03-06','19:00','23:00',null,null,120000,0,null,null) id`,
  [MC1, MV])).rows[0].id

const musait = async (ignore) => (await db.query(
  `select is_available, severity, conflict_label
     from venue_availability('2027-03-06','19:00','23:00', null, $1) where venue_id = $2`,
  [ignore, MV])).rows[0]

await step('kendi kaydı hariç tutulmazsa ÇAKIŞMA görünüyor', async () => {
  const r = await musait(null)
  if (r.is_available !== false || r.severity !== 'engel') {
    throw new Error(JSON.stringify(r))
  }
})

await step('kendi kaydı hariç tutulunca müsait görünüyor', async () => {
  const r = await musait(MR)
  if (r.is_available !== true || r.severity !== null) throw new Error(JSON.stringify(r))
})

// Hariç tutma yalnızca O kaydı atlamalı; başkasının kaydını gizlememeli.
//
// Komşu 10:00-13:00 seçildi: mevcut 19:00 kaydına 6 saat uzak olduğu için
// veritabanı eklemeye izin veriyor. Sorgu ise 13:30-17:00 — komşuya 30 dakika
// kalıyor, yani asgari 60 dakikanın altında.
await step('kendini atlamak BAŞKA rezervasyonu gizlemiyor', async () => {
  await db.query(
    `select save_reservation(null,$1,$2,null,'nisan','kesinlesti','2027-03-06','10:00','13:00',null,null,50000,0,null,null)`,
    [MC2, MV])
  const r = (await db.query(
    `select is_available, severity, conflict_label
       from venue_availability('2027-03-06','13:30','17:00', null, $1) where venue_id = $2`,
    [MR, MV])).rows[0]
  if (r.is_available !== false || r.conflict_label !== 'Ayşe & Can') {
    throw new Error(JSON.stringify(r))
  }
})

console.log('\n\x1b[1m15) Rezervasyon ek hizmet kalemleri\x1b[0m')

await as(U.ownerA)
const KV = (await db.query(`insert into venues (name) values ('Kalem Salonu') returning id`)).rows[0].id
const KC = (await db.query(`insert into customers (full_name, phone) values ('Kalem Müşteri','05002220001') returning id`)).rows[0].id

const kaydet = (id, paket, kalemler) => db.query(
  `select save_reservation($1,$2,$3,null,'dugun','kesinlesti','2027-06-12','19:00','23:00',
          null,null,$4,0,null,null,$5::jsonb) id`,
  [id, KC, KV, paket, kalemler === null ? null : JSON.stringify(kalemler)])

const fiyat = (id) => db.query(
  `select package_amount, extras_amount, gross_amount, net_amount
     from reservation_pricing where reservation_id = $1`, [id]).then(r => r.rows[0])

let KR
await step('kalemler kaydediliyor ve brüt paket + kalemler oluyor', async () => {
  KR = (await kaydet(null, 100000, [
    { name: 'Dış çekim', amount: 12000 },
    { name: 'Havai fişek', amount: 8000 },
  ])).rows[0].id
  const f = await fiyat(KR)
  if (Number(f.package_amount) !== 100000 || Number(f.extras_amount) !== 20000
      || Number(f.gross_amount) !== 120000) {
    throw new Error(JSON.stringify(f))
  }
})

await step('kalem silinince brüt düşüyor', async () => {
  await db.query(`delete from reservation_items where reservation_id = $1 and name = 'Havai fişek'`, [KR])
  const f = await fiyat(KR)
  if (Number(f.extras_amount) !== 12000 || Number(f.gross_amount) !== 112000) {
    throw new Error(JSON.stringify(f))
  }
})

await step('kalem tutarı değişince brüt güncelleniyor', async () => {
  await db.query(`update reservation_items set amount = 15000 where reservation_id = $1`, [KR])
  const f = await fiyat(KR)
  if (Number(f.gross_amount) !== 115000) throw new Error(JSON.stringify(f))
})

await step('yeniden kaydetmek kalemleri baştan yazıyor', async () => {
  await kaydet(KR, 100000, [{ name: 'Dış çekim', amount: 5000 }])
  const say = (await db.query(
    `select count(*)::int c from reservation_items where reservation_id = $1`, [KR])).rows[0].c
  const f = await fiyat(KR)
  if (say !== 1 || Number(f.gross_amount) !== 105000) {
    throw new Error(`${say} kalem, ${JSON.stringify(f)}`)
  }
})

// convert_lead kalem göndermeden çağırıyor; oradaki davranış değişmemeli.
await step('kalem gönderilmezse mevcut kalemlere dokunulmuyor', async () => {
  await kaydet(KR, 100000, null)
  const say = (await db.query(
    `select count(*)::int c from reservation_items where reservation_id = $1`, [KR])).rows[0].c
  const f = await fiyat(KR)
  if (say !== 1 || Number(f.gross_amount) !== 105000) {
    throw new Error(`${say} kalem, ${JSON.stringify(f)}`)
  }
})

await step('adı boş kalem yok sayılıyor', async () => {
  await kaydet(KR, 100000, [{ name: '  ', amount: 9999 }, { name: 'Dış çekim', amount: 5000 }])
  const f = await fiyat(KR)
  if (Number(f.gross_amount) !== 105000) throw new Error(JSON.stringify(f))
})

await expectFail('brüt, paket + kalemlerden farklı yazılamıyor', () =>
  db.query(`update reservation_pricing set gross_amount = 999999 where reservation_id = $1`, [KR]),
  'pricing_gross_is_package_plus_extras')

await step('rezervasyon silinince kalemler de siliniyor', async () => {
  const once = (await db.query('select count(*)::int c from reservation_items')).rows[0].c
  await db.query('delete from reservations where id = $1', [KR])
  const sonra = (await db.query('select count(*)::int c from reservation_items')).rows[0].c
  if (sonra !== once - 1) throw new Error(`${once} -> ${sonra}`)
})

console.log(`\n\x1b[1mSonuç:\x1b[0m \x1b[32m${pass} geçti\x1b[0m, ${fail ? `\x1b[31m${fail} başarısız\x1b[0m` : '0 başarısız'}\n`)
process.exit(fail ? 1 : 0)
