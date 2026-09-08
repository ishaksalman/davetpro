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
await expectFail('net satış, tahsil edilenin altına indirilemez',
  () => db.query(`update reservation_pricing set gross_amount = 10000 where reservation_id = $1`, [resA]),
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

console.log(`\n\x1b[1mSonuç:\x1b[0m \x1b[32m${pass} geçti\x1b[0m, ${fail ? `\x1b[31m${fail} başarısız\x1b[0m` : '0 başarısız'}\n`)
process.exit(fail ? 1 : 0)
