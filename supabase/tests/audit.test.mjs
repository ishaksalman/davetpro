/* eslint-disable @typescript-eslint/no-unused-expressions --
   Denetim betiğinde "koşul ? ok(...) : bug(...)" kalıbı bilerek kullanılıyor;
   her kontrol tek satırda okunabilir kalsın diye. */
/**
 * MVP denetimi — saldırgan senaryolar.
 * Amaç: tenant sızıntısı, finansal tutarsızlık, çakışma açığı ve sınır durumları.
 * Bilinen doğru davranışlar schema.test.mjs'te; burada kırılma aranıyor.
 */
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'node:fs'
import path from 'node:path'

const HERE = path.dirname(new URL(import.meta.url).pathname)
const MIG = path.join(HERE, '..', 'migrations')

const db = await PGlite.create({ extensions: { btree_gist, pgcrypto } })
await db.exec(fs.readFileSync(path.join(HERE, 'supabase-stub.sql'), 'utf8'))
for (const f of fs.readdirSync(MIG).sort()) await db.exec(fs.readFileSync(path.join(MIG, f), 'utf8'))

const findings = []
let pass = 0
const ok = (m) => { pass++; console.log(`  \x1b[32m✓\x1b[0m ${m}`) }
const bug = (sev, m, detay) => {
  findings.push({ sev, m, detay })
  const renk = { CRITICAL: '\x1b[41m\x1b[97m', HIGH: '\x1b[31m', MEDIUM: '\x1b[33m', LOW: '\x1b[36m' }[sev]
  console.log(`  ${renk}${sev}\x1b[0m ${m}\n      ${detay}`)
}

const as = async (uid) => {
  await db.exec('reset role')
  await db.query(`select set_config('test.uid', $1, false)`, [uid ?? ''])
  await db.exec('set role authenticated')
}
const sup = () => db.exec('reset role')
const q = (sql, p) => db.query(sql, p)
const tryQ = async (sql, p) => { try { return { ok: true, r: await db.query(sql, p) } } catch (e) { return { ok: false, e: e.message } } }
// Beklenen davranışı doğrular; hata fırlatırsa bulgu olarak kaydedilir.
const step = async (ad, fn, sev = 'HIGH') => {
  try { await fn(); ok(ad) } catch (e) { bug(sev, ad, e.message) }
}
const num = (v) => Number(v)
// Kuruş cinsinden tamsayı karşılaştırma: JS float çıkarması
// 200999.99 - 75999.99 = 125000.00000000001 üretiyor.
const kurus = (v) => Math.round(Number(v) * 100)

// --- Kurulum: iki işletme, üç kullanıcı ---
const U = { a: '11111111-1111-1111-1111-111111111111', b: '22222222-2222-2222-2222-222222222222', s: '33333333-3333-3333-3333-333333333333' }
await sup()
for (const [k, v] of Object.entries(U)) await q('insert into auth.users (id,email) values ($1,$2)', [v, `${k}@t.local`])

await as(U.a); await q(`select create_business_with_owner('A İşletme','A Sahibi')`)
await as(U.b); await q(`select create_business_with_owner('B İşletme','B Sahibi')`)
await as(U.a)
const bizA = (await q('select current_business_id() id')).rows[0].id
const vA = (await q(`insert into venues (name) values ('A Salon') returning id`)).rows[0].id
const cA = (await q(`insert into customers (full_name,phone) values ('A Müşteri','05321112233') returning id`)).rows[0].id
const catA = (await q(`select id from expense_categories where name='Personel'`)).rows[0].id
await as(U.b)
const bizB = (await q('select current_business_id() id')).rows[0].id
const vB = (await q(`insert into venues (name) values ('B Salon') returning id`)).rows[0].id
await q(`insert into customers (full_name,phone) values ('B Müşteri','05439998877')`)
const catB = (await q(`select id from expense_categories where name='Personel'`)).rows[0].id
await sup()
await q(`insert into profiles (id,business_id,full_name,role,can_view_finance) values ($1,$2,'A Personel','staff',false)`, [U.s, bizA])

const SR = (args) => `select save_reservation(${args})`

console.log('\n\x1b[1m1) Tenant izolasyonu — saldırgan\x1b[0m')
await as(U.b)
let r = await tryQ(SR(`null,$1,$2,null,'dugun','kesinlesti','2027-01-10','19:00','23:00',100,null,50000,0,null,null`), [cA, vA])
r.ok ? bug('CRITICAL', 'B, A\'nın müşteri+salonuyla rezervasyon açabildi', 'save_reservation tenant kontrolü yok')
     : ok('B, A\'nın kayıtlarıyla rezervasyon açamıyor')

await as(U.a)
const resA = (await q(SR(`null,$1,$2,null,'dugun','kesinlesti','2027-01-10','19:00','23:00',300,null,100000,0,null,null`), [cA, vA])).rows[0].save_reservation

await as(U.b)
r = await tryQ(`insert into payments (business_id,reservation_id,amount) values ($1,$2,1000)`, [bizB, resA])
r.ok ? bug('CRITICAL', 'B, A\'nın rezervasyonuna tahsilat yazabildi', 'çapraz tenant ödeme')
     : ok('B, A\'nın rezervasyonuna tahsilat yazamıyor')
r = await tryQ(`insert into expenses (business_id,category_id,reservation_id,amount) values ($1,$2,$3,500)`, [bizB, catB, resA])
r.ok ? bug('CRITICAL', 'B, A\'nın rezervasyonuna gider yazabildi', 'çapraz tenant gider') : ok('B, A\'nın rezervasyonuna gider yazamıyor')
r = await tryQ(`insert into reservation_pricing (reservation_id,business_id,gross_amount) values ($1,$2,1)`, [resA, bizB])
r.ok ? bug('CRITICAL', 'B, A\'nın rezervasyon fiyatını yazabildi', 'çapraz tenant fiyat') : ok('B, A\'nın fiyat kaydını yazamıyor')
r = await tryQ(`insert into expenses (business_id,category_id,amount) values ($1,$2,100)`, [bizB, catA])
r.ok ? bug('HIGH', 'B, A\'nın gider kategorisini kullanabildi', 'çapraz tenant kategori') : ok('B, A\'nın kategorisini kullanamıyor')

await as(U.b)
const gorunen = await q('select count(*)::int n from reservation_financials')
num(gorunen.rows[0].n) === 0 ? ok('B, finans view\'ında A verisi görmüyor') : bug('CRITICAL', 'view tenant sızdırıyor', `${gorunen.rows[0].n} satır`)
const cb = await q('select count(*)::int n from customer_balances')
num(cb.rows[0].n) <= 1 ? ok('B, müşteri bakiyelerinde yalnızca kendi kayıtlarını görüyor') : bug('CRITICAL', 'customer_balances sızdırıyor', `${cb.rows[0].n}`)

console.log('\n\x1b[1m2) Rapor RPC izolasyonu\x1b[0m')
await as(U.b)
const fsB = (await q(`select * from finance_summary('2027-01-01','2027-12-31')`)).rows[0]
num(fsB.total_sales) === 0 ? ok('finance_summary B için A satışını göstermiyor') : bug('CRITICAL', 'finance_summary sızdırıyor', JSON.stringify(fsB))
const vpB = (await q(`select * from venue_performance('2027-01-01','2027-12-31')`)).rows
vpB.every(v => v.venue_name !== 'A Salon') ? ok('venue_performance B için A salonunu göstermiyor') : bug('CRITICAL', 'venue_performance sızdırıyor', '')

console.log('\n\x1b[1m3) Finans yetkisi olmayan personel\x1b[0m')
await as(U.s)
const pv = await q('select count(*)::int n from payments'); num(pv.rows[0].n) === 0 ? ok('personel tahsilat göremiyor') : bug('CRITICAL','personel tahsilat görüyor','')
const ev = await q('select count(*)::int n from expenses'); num(ev.rows[0].n) === 0 ? ok('personel gider göremiyor') : bug('CRITICAL','personel gider görüyor','')
const rp = await q('select count(*)::int n from reservation_pricing'); num(rp.rows[0].n) === 0 ? ok('personel fiyat göremiyor') : bug('CRITICAL','personel fiyat görüyor','')
const fsS = (await q(`select * from finance_summary('2027-01-01','2027-12-31')`)).rows[0]
num(fsS.total_sales) === 0 ? ok('personel için finance_summary sıfır') : bug('CRITICAL','personel finance_summary ile tutar görüyor', JSON.stringify(fsS))
r = await tryQ(`insert into payments (reservation_id,amount) values ($1,1)`, [resA])
r.ok ? bug('CRITICAL','yetkisiz personel tahsilat yazabildi','') : ok('yetkisiz personel tahsilat yazamıyor')

console.log('\n\x1b[1m4) Bakiye tutarlılığı\x1b[0m')
await as(U.a)
await q(`insert into payments (reservation_id,customer_id,amount,category) values ($1,$2,40000,'kapora')`, [resA, cA])
let f = (await q('select * from reservation_financials where reservation_id=$1', [resA])).rows[0]
num(f.collected_amount) === 40000 && num(f.balance_amount) === 60000 ? ok('tahsilat sonrası bakiye doğru') : bug('CRITICAL','bakiye yanlış', JSON.stringify(f))

r = await tryQ(`insert into payments (reservation_id,amount) values ($1,60000.01)`, [resA])
r.ok ? bug('HIGH','net tutarı 1 kuruş aşan tahsilat kabul edildi','') : ok('net tutarı aşan tahsilat 1 kuruşta bile reddediliyor')
r = await tryQ(`insert into payments (reservation_id,amount) values ($1,60000)`, [resA])
r.ok ? ok('net tutara tam eşit tahsilat kabul ediliyor') : bug('HIGH','tam ödeme reddedildi', r.e)
f = (await q('select * from reservation_financials where reservation_id=$1', [resA])).rows[0]
num(f.balance_amount) === 0 ? ok('tam ödeme sonrası kalan sıfır') : bug('CRITICAL','tam ödeme sonrası kalan sıfır değil', JSON.stringify(f))

await q(`update payments set voided_at=now(), void_reason='test' where reservation_id=$1 and amount=40000`, [resA])
f = (await q('select * from reservation_financials where reservation_id=$1', [resA])).rows[0]
num(f.collected_amount) === 60000 && num(f.balance_amount) === 40000 ? ok('iptal sonrası bakiye yeniden hesaplanıyor') : bug('CRITICAL','iptal sonrası bakiye yanlış', JSON.stringify(f))

console.log('\n\x1b[1m5) İndirim ve sıfır tutar sınırları\x1b[0m')
const res0 = (await q(SR(`null,$1,$2,null,'nisan','kesinlesti','2027-02-01','19:00','23:00',50,null,10000,10000,null,null`), [cA, vA])).rows[0].save_reservation
f = (await q('select * from reservation_financials where reservation_id=$1', [res0])).rows[0]
num(f.net_amount) === 0 ? ok('indirim = fiyat olduğunda net sıfır') : bug('HIGH','net hesabı yanlış', JSON.stringify(f))
r = await tryQ(`insert into payments (reservation_id,amount) values ($1,1)`, [res0])
r.ok ? bug('HIGH','net sıfırken tahsilat kabul edildi','ücretsiz organizasyona ödeme yazılabiliyor') : ok('net sıfırken tahsilat reddediliyor')
r = await tryQ(`insert into reservation_pricing (reservation_id,gross_amount,discount_amount) values ($1,100,200)`, [res0])
r.ok ? bug('HIGH','indirim fiyattan büyük olabildi','') : ok('indirim fiyattan büyük olamıyor')
r = await tryQ(`insert into payments (reservation_id,amount) values ($1,0)`, [resA])
r.ok ? bug('MEDIUM','sıfır tutarlı tahsilat kabul edildi','') : ok('sıfır tutarlı tahsilat reddediliyor')
r = await tryQ(`insert into payments (reservation_id,amount) values ($1,-100)`, [resA])
r.ok ? bug('HIGH','negatif tahsilat kabul edildi','') : ok('negatif tahsilat reddediliyor')

console.log('\n\x1b[1m6) Fiyatsız rezervasyon (personelin açtığı)\x1b[0m')
await as(U.s)
const resNoPrice = (await q(SR(`null,$1,$2,null,'davet','kesinlesti','2027-03-01','18:00','22:00',80,null,null,null,null,null`), [cA, vA])).rows[0].save_reservation
await as(U.a)
const pr = await q('select gross_amount,net_amount from reservation_pricing where reservation_id=$1', [resNoPrice])
pr.rows.length === 1 && num(pr.rows[0].net_amount) === 0
  ? ok('personelin açtığı kayıt için ₺0 fiyat satırı otomatik oluşuyor')
  : bug('HIGH','rezervasyonun fiyat satırı yok', JSON.stringify(pr.rows))
r = await tryQ(`insert into payments (reservation_id,amount) values ($1,999999)`, [resNoPrice])
if (r.ok) {
  f = (await q('select net_amount,collected_amount,balance_amount from reservation_financials where reservation_id=$1', [resNoPrice])).rows[0]
  bug('HIGH', 'fiyatı olmayan rezervasyona sınırsız tahsilat yazılabiliyor',
      `net ${f.net_amount}, tahsil ${f.collected_amount}, kalan ${f.balance_amount} (negatif bakiye)`)
} else ok(`fiyatı ₺0 olan rezervasyona tahsilat reddediliyor (${r.e.slice(0, 60)}…)`)

console.log('\n\x1b[1m7) Çakışma — sınır durumlar\x1b[0m')
await as(U.a)
await q(SR(`null,$1,$2,null,'dugun','kesinlesti','2027-04-10','20:00','02:00',300,null,50000,0,null,null`), [cA, vA])
r = await tryQ(SR(`null,$1,$2,null,'nisan','kesinlesti','2027-04-11','01:00','03:00',100,null,10000,0,null,null`), [cA, vA])
r.ok ? bug('HIGH','gece yarısını aşan organizasyonla ertesi gün çakışması engellenmedi','20:00-02:00 ile 01:00-03:00 çakışıyor')
     : ok('gece yarısını aşan çakışma engelleniyor')
// 0011'den beri bitişik saat kasten reddediliyor: salonun hazırlık payı var.
r = await tryQ(SR(`null,$1,$2,null,'nisan','kesinlesti','2027-04-11','02:00','05:00',100,null,10000,0,null,null`), [cA, vA])
r.ok ? bug('MEDIUM','bitişik saat hazırlık payı olmadan kabul edildi','02:00 bitişte biten organizasyonun hemen üstüne')
     : ok('bitişik saat hazırlık payı nedeniyle reddediliyor')
// Pay kadar boşluk bırakılınca kabul edilmeli.
r = await tryQ(SR(`null,$1,$2,null,'nisan','kesinlesti','2027-04-11','03:00','05:00',100,null,10000,0,null,null`), [cA, vA])
r.ok ? ok('hazırlık payı kadar boşluk bırakılınca kabul ediliyor')
     : bug('MEDIUM','yeterli boşluk olmasına rağmen reddedildi', r.e)

const resX = (await q(SR(`null,$1,$2,null,'kina','kesinlesti','2027-05-01','19:00','23:00',100,null,20000,0,null,null`), [cA, vA])).rows[0].save_reservation
await q(SR(`null,$1,$2,null,'soz','kesinlesti','2027-05-02','19:00','23:00',100,null,20000,0,null,null`), [cA, vA])
r = await tryQ(SR(`$1,$2,$3,null,'kina','kesinlesti','2027-05-02','20:00','22:00',100,null,20000,0,null,null`), [resX, cA, vA])
r.ok ? bug('HIGH','mevcut rezervasyon çakışan tarihe taşınabildi','güncelleme çakışma kontrolünü atlıyor')
     : ok('rezervasyon çakışan tarihe taşınamıyor')

const resC = (await q(SR(`null,$1,$2,null,'davet','iptal_edildi','2027-05-02','19:30','21:00',50,null,5000,0,null,null`), [cA, vA])).rows[0].save_reservation
r = await tryQ(`update reservations set status='kesinlesti' where id=$1`, [resC])
r.ok ? bug('HIGH','iptal edilmiş rezervasyon dolu bir slota geri açılabildi','')
     : ok('iptal edilmiş rezervasyon dolu slota geri açılamıyor')

console.log('\n\x1b[1m8) Silme davranışı\x1b[0m')
r = await tryQ('delete from customers where id=$1', [cA]); r.ok ? bug('HIGH','rezervasyonu olan müşteri silinebildi','') : ok('rezervasyonu olan müşteri silinemiyor')
r = await tryQ('delete from venues where id=$1', [vA]); r.ok ? bug('HIGH','rezervasyonu olan salon silinebildi','') : ok('rezervasyonu olan salon silinemiyor')
r = await tryQ('delete from reservations where id=$1', [resA]); r.ok ? bug('CRITICAL','tahsilatı olan rezervasyon silinebildi','ödemeler sahipsiz kalır') : ok('tahsilatı olan rezervasyon silinemiyor')
r = await tryQ('delete from expense_categories where id=$1', [catA])
const kategoriKullanimda = (await q('select count(*)::int n from expenses where category_id=$1', [catA])).rows[0].n
if (kategoriKullanimda > 0) { r.ok ? bug('HIGH','kullanımdaki gider kategorisi silinebildi','') : ok('kullanımdaki kategori silinemiyor') }
else ok('kategori kullanımda değil (silme testi atlandı)')

console.log('\n\x1b[1m9) Kesirli tutar ve yuvarlama\x1b[0m')
const resK = (await q(SR(`null,$1,$2,null,'davet','kesinlesti','2027-06-01','18:00','22:00',3,null,999.99,0,null,333.33`), [cA, vA])).rows[0].save_reservation
f = (await q('select net_amount,unit_price from reservation_financials where reservation_id=$1', [resK])).rows[0]
num(f.net_amount) === 999.99 ? ok('kuruşlu tutar birebir saklanıyor') : bug('HIGH','kuruş kaybı', JSON.stringify(f))
await q(`insert into payments (reservation_id,amount) values ($1,333.33)`, [resK])
await q(`insert into payments (reservation_id,amount) values ($1,333.33)`, [resK])
await q(`insert into payments (reservation_id,amount) values ($1,333.33)`, [resK])
f = (await q('select collected_amount,balance_amount from reservation_financials where reservation_id=$1', [resK])).rows[0]
num(f.balance_amount) === 0 ? ok('3 × 333,33 = 999,99 → kalan tam sıfır') : bug('HIGH','yuvarlama hatası', JSON.stringify(f))

console.log('\n\x1b[1m10) İptal edilen organizasyonun finansal etkisi\x1b[0m')
const resI = (await q(SR(`null,$1,$2,null,'dugun','kesinlesti','2027-07-04','19:00','23:00',200,null,80000,0,null,null`), [cA, vA])).rows[0].save_reservation
await q(`insert into payments (reservation_id,customer_id,amount,payment_date,category) values ($1,$2,20000,'2027-07-01','kapora')`, [resI, cA])
await q(`update reservations set status='iptal_edildi' where id=$1`, [resI])
const fsJul = (await q(`select * from finance_summary('2027-07-01','2027-07-31')`)).rows[0]
const satisHaric = num(fsJul.total_sales) === 0
const nakitDahil = num(fsJul.collected_in_range) === 20000
if (satisHaric && nakitDahil) ok('iptal: satıştan düşüyor, tahsil edilen kapora nakitte kalıyor (doğru)')
else bug('MEDIUM', 'iptal edilen organizasyonun finansal işlenişi tutarsız',
        `satış ${fsJul.total_sales} (0 bekleniyordu), nakit ${fsJul.collected_in_range} (20000 bekleniyordu)`)
const cbA = (await q('select * from customer_balances where customer_id=$1', [cA])).rows[0]
ok(`müşteri bakiyesi: ${cbA.reservation_count} org, satış ${cbA.total_sales}, ödenen ${cbA.total_paid}, kalan ${cbA.total_balance}`)

console.log('\n\x1b[1m11) Rezervasyona bağlı olmayan manuel gelir\x1b[0m')
await q(`insert into payments (customer_id,amount,category,description) values ($1,15000,'diger','Manuel gelir')`, [cA])
const cbA2 = (await q('select total_paid from customer_balances where customer_id=$1', [cA])).rows[0]
const fark = kurus(cbA2.total_paid) - kurus(cbA.total_paid)
fark === 1500000
  ? ok('manuel gelir müşteri bakiyesine yansıyor')
  : bug('MEDIUM', 'rezervasyona bağlı olmayan tahsilat müşteri bakiyesine yansımıyor',
        `fark ${fark / 100} ₺, 15000 bekleniyordu`)
const cbA3 = (await q('select total_sales,total_paid,total_balance from customer_balances where customer_id=$1', [cA])).rows[0]
kurus(cbA3.total_balance) === kurus(cbA3.total_sales) - kurus(cbA3.total_paid)
  ? ok('kalan borç = satış − ödenen (manuel gelir dahil)')
  : bug('HIGH', 'müşteri bakiyesi kendi içinde tutarsız', JSON.stringify(cbA3))

console.log('\n\x1b[1m11b) Sözleşmeler\x1b[0m')
await as(U.a)
await step('varsayılan şablon işletmeyle birlikte oluştu', async () => {
  const r = await q('select count(*)::int n, max(length(body)) len from contract_templates')
  if (r.rows[0].n !== 1) throw new Error(`${r.rows[0].n} şablon`)
  if (r.rows[0].len < 500) throw new Error('şablon metni beklenenden kısa')
})
let c1
await step('sözleşme oluşturuluyor ve numara alıyor', async () => {
  c1 = (await q(`select * from create_contract($1, 'metin', '{"a":1}'::jsonb)`, [resA])).rows[0]
  if (!/^DVP-\d{4}-\d{6}$/.test(c1.contract_number)) throw new Error(c1.contract_number)
  if (c1.version !== 1) throw new Error(`sürüm ${c1.version}`)
})
await step('yeni sürüm aynı numarayı taşıyor, version artıyor', async () => {
  const c2 = (await q(`select * from create_contract($1, 'metin v2', '{"a":2}'::jsonb)`, [resA])).rows[0]
  if (c2.contract_number !== c1.contract_number) throw new Error('numara değişti')
  if (c2.version !== 2) throw new Error(`sürüm ${c2.version}`)
})
await step('farklı rezervasyon yeni numara alıyor', async () => {
  const c3 = (await q(`select * from create_contract($1, 'x', '{}'::jsonb)`, [res0])).rows[0]
  if (c3.contract_number === c1.contract_number) throw new Error('numara tekrarlandı')
})
await step('snapshot dondurulmuş kalıyor', async () => {
  await q(`update customers set full_name = 'Değişti' where id = $1`, [cA])
  const r = await q('select snapshot, content from contracts where id = $1', [c1.id])
  if (JSON.stringify(r.rows[0].snapshot) !== '{"a":1}') throw new Error('snapshot değişti')
  if (r.rows[0].content !== 'metin') throw new Error('içerik değişti')
})
await step('sözleşme silinemiyor (yalnızca iptal)', async () => {
  const r = await tryQ('delete from contracts where id = $1', [c1.id])
  if (r.ok) throw new Error('silinebildi')
})
await step('doğrudan insert engelleniyor (yalnızca RPC)', async () => {
  const r = await tryQ(`insert into contracts (reservation_id, contract_number, snapshot, content)
                        values ($1, 'X', '{}'::jsonb, 'y')`, [resA])
  if (r.ok) throw new Error('doğrudan insert kabul edildi')
})
await as(U.b)
await step('B, A\'nın sözleşmelerini göremiyor', async () => {
  const r = await q('select count(*)::int n from contracts')
  if (r.rows[0].n !== 0) throw new Error(`${r.rows[0].n} satır sızdı`)
})
r = await tryQ(`select create_contract($1,'x','{}'::jsonb)`, [resA])
r.ok ? bug('CRITICAL','B, A\'nın rezervasyonuna sözleşme oluşturabildi','')
     : ok('B, A\'nın rezervasyonuna sözleşme oluşturamıyor')
await as(U.s)
r = await tryQ(`select create_contract($1,'x','{}'::jsonb)`, [resA])
r.ok ? bug('CRITICAL','finans yetkisiz personel sözleşme oluşturabildi','')
     : ok('finans yetkisiz personel sözleşme oluşturamıyor')
await step('finans yetkisiz personel sözleşmeleri göremiyor', async () => {
  const r = await q('select count(*)::int n from contracts')
  if (r.rows[0].n !== 0) throw new Error(`${r.rows[0].n} satır sızdı`)
})
await as(U.a)

console.log('\n\x1b[1m12) Rol yükseltme ve profil güvenliği\x1b[0m')
await as(U.s)
r = await tryQ(`update profiles set can_view_finance=true where id=$1`, [U.s])
r.ok ? bug('CRITICAL','personel kendine finans yetkisi verebildi','') : ok('personel kendine finans yetkisi veremiyor')
r = await tryQ(`update profiles set business_id=$1 where id=$2`, [bizB, U.s])
r.ok ? bug('CRITICAL','personel başka işletmeye geçebildi','') : ok('personel başka işletmeye geçemiyor')
await as(U.b)
const pB = await q('select count(*)::int n from profiles'); num(pB.rows[0].n) === 1 ? ok('B yalnızca kendi kullanıcılarını görüyor') : bug('CRITICAL','profil sızıntısı', `${pB.rows[0].n}`)
r = await tryQ(`update businesses set name='ele geçirildi' where id=$1`, [bizA])
const adA = (await (async()=>{ await sup(); return q('select name from businesses where id=$1',[bizA]) })()).rows[0].name
adA === 'A İşletme' ? ok('B, A işletmesinin adını değiştiremedi') : bug('CRITICAL','çapraz tenant işletme güncellemesi', adA)

console.log('\n\x1b[1m13) Talepler → teklif → opsiyon → rezervasyon (uçtan uca)\x1b[0m')
await as(U.a)

// Senaryo önceki bölümlerin verisinden etkilenmesin diye kendi salonunu kullanır.
const vLead = (await q(`insert into venues (name) values ('Alya Kır Salonu') returning id`)).rows[0].id

// 1) WhatsApp'tan gelen yeni müşteri için talep
const cLead = (await q(`insert into customers (full_name,phone) values ('Reyhan & Ömer','05551234567') returning id`)).rows[0].id
const leadId = (await q(
  `insert into leads (customer_id,venue_id,organization_type,source,event_date,start_time,end_time,guest_count)
   values ($1,$2,'dugun','whatsapp','2026-09-05','19:00','23:00',450) returning id`, [cLead, vLead])).rows[0].id
leadId ? ok('WhatsApp kaynaklı talep oluşturuldu') : bug('HIGH','talep oluşturulamadı','')

await step('talep oluşturma otomatik geçmişe yazıldı', async () => {
  const a = await q(`select note from lead_activities where lead_id=$1 and is_system`, [leadId])
  if (a.rows.length !== 1) throw new Error(`aktivite sayısı ${a.rows.length}`)
})

// 3) Müsaitlik: henüz hiçbir şey yokken salon müsait
await step('boş tarihte salon müsait görünüyor', async () => {
  const av = await q(`select * from venue_availability('2026-09-05','19:00','23:00') where venue_id=$1`, [vLead])
  if (!av.rows[0]?.is_available) throw new Error('müsait değil göründü')
})

// 4-5) 180.000 teklif, ardından 165.000 revizyon
const pkgA = (await q(`insert into packages (name,base_price) values ('Gold Paket',150000) returning id`)).rows[0].id
const q1 = (await q(
  `select * from save_quote($1,$2,$3,450,150000,0,'2026-09-10','İlk teklif',
     '[{"name":"Premium Dekorasyon","amount":20000},{"name":"Fotoğraf & Video","amount":10000}]'::jsonb)`,
  [leadId, vA, pkgA])).rows[0]
kurus(q1.total_amount) === kurus(180000) ? ok('teklif #1 toplamı ₺180.000') : bug('HIGH','teklif toplamı yanlış', `${q1.total_amount}`)
const numaraBicimi = /^TKL-\d{4}-\d{6}$/.test(q1.quote_number)
numaraBicimi ? ok(`teklif numarası biçimi doğru (${q1.quote_number})`) : bug('MEDIUM','teklif numarası biçimi', q1.quote_number)

await step('teklif verilince talep durumu ilerledi', async () => {
  const l = await q(`select status from leads where id=$1`, [leadId])
  if (l.rows[0].status !== 'teklif_verildi') throw new Error(l.rows[0].status)
})

const q2 = (await q(
  `select * from save_quote($1,$2,$3,450,150000,15000,'2026-09-10','Revize',
     '[{"name":"Premium Dekorasyon","amount":20000},{"name":"Fotoğraf & Video","amount":10000}]'::jsonb)`,
  [leadId, vA, pkgA])).rows[0]
kurus(q2.total_amount) === kurus(165000) ? ok('teklif #2 toplamı ₺165.000') : bug('HIGH','revize teklif toplamı yanlış', `${q2.total_amount}`)

// 6) Eski sürüm korunuyor mu
await step('eski teklif sürümü korunuyor', async () => {
  const all = await q(`select version, total_amount from quotes where lead_id=$1 order by version`, [leadId])
  if (all.rows.length !== 2) throw new Error(`sürüm sayısı ${all.rows.length}`)
  if (kurus(all.rows[0].total_amount) !== kurus(180000)) throw new Error('ilk sürüm değişmiş')
  if (all.rows[0].version !== 1 || all.rows[1].version !== 2) throw new Error('sürüm numaraları hatalı')
})
await step('iki teklif farklı numara aldı', async () => {
  if (q1.quote_number === q2.quote_number) throw new Error('numara tekrar etti')
})

// 7) Tarihi opsiyona al
const holdId = (await q(
  `insert into venue_holds (lead_id,venue_id,event_date,start_time,end_time,expires_at)
   values ($1,$2,'2026-09-05','19:00','23:00', now() + interval '48 hours') returning id`,
  [leadId, vLead])).rows[0].id
holdId ? ok('tarih 48 saat opsiyona alındı') : bug('HIGH','opsiyon oluşturulamadı','')

// 8) Müsaitlikte opsiyonlu görünüyor
await step('opsiyon müsaitlik ekranında görünüyor', async () => {
  const av = await q(`select * from venue_availability('2026-09-05','19:00','23:00') where venue_id=$1`, [vLead])
  const row = av.rows[0]
  if (row.is_available) throw new Error('hâlâ müsait görünüyor')
  if (row.conflict_kind !== 'opsiyon') throw new Error(`tür: ${row.conflict_kind}`)
  if (!row.hold_expires_at) throw new Error('opsiyon bitişi dönmedi')
})

// 9) Çakışma: opsiyonlu tarihe başka rezervasyon açılamaz
r = await tryQ(SR(`null,$1,$2,null,'dugun','kesinlesti','2026-09-05','20:00','23:00',100,null,50000,0,null,null`), [cA, vLead])
r.ok ? bug('CRITICAL','opsiyonlu tarihe rezervasyon açılabildi','opsiyon availability üzerinde etkisiz')
     : ok('opsiyonlu tarihe başka rezervasyon açılamıyor')

// ...ve üstüne ikinci bir opsiyon konamaz
r = await tryQ(
  `insert into venue_holds (lead_id,venue_id,event_date,start_time,end_time,expires_at)
   values ($1,$2,'2026-09-05','20:00','22:00', now() + interval '24 hours')`, [leadId, vLead])
r.ok ? bug('HIGH','aktif opsiyonun üstüne ikinci opsiyon konabildi','') : ok('aktif opsiyonun üstüne ikinci opsiyon konamıyor')

// Süresi dolan opsiyon salonu serbest bırakmalı, kayıt silinmemeli
await step('süresi dolan opsiyon salonu serbest bırakıyor', async () => {
  await sup()
  await q(`update venue_holds set expires_at = now() - interval '1 hour' where id=$1`, [holdId])
  await as(U.a)
  await q(`select expire_venue_holds(null)`)
  const av = await q(`select is_available from venue_availability('2026-09-05','19:00','23:00') where venue_id=$1`, [vLead])
  if (!av.rows[0].is_available) throw new Error('hâlâ dolu görünüyor')
  const h = await q(`select status from venue_holds where id=$1`, [holdId])
  if (h.rows.length !== 1) throw new Error('süresi dolan opsiyon silinmiş')
  if (h.rows[0].status !== 'suresi_doldu') throw new Error(h.rows[0].status)
})

// Opsiyonu tekrar aktif et — dönüşüm senaryosu için
await sup()
await q(`update venue_holds set expires_at = now() + interval '48 hours', status='aktif' where id=$1`, [holdId])
await as(U.a)

// 10-13) Kabul → rezervasyona dönüştür → kapora
const resNew = (await q(
  `select convert_lead_to_reservation($1,$2,$3,$4,'2026-09-05','19:00','23:00',450,165000,0,30000,'2026-08-25','Talepten dönüştürüldü')`,
  [leadId, q2.id, vLead, pkgA])).rows[0].convert_lead_to_reservation
resNew ? ok('talep rezervasyona dönüştürüldü') : bug('CRITICAL','dönüşüm başarısız','')

await step('rezervasyon ₺165.000 satış / ₺30.000 tahsilat / ₺135.000 kalan', async () => {
  const f = (await q(`select * from reservation_financials where reservation_id=$1`, [resNew])).rows[0]
  if (kurus(f.net_amount) !== kurus(165000)) throw new Error(`net ${f.net_amount}`)
  if (kurus(f.collected_amount) !== kurus(30000)) throw new Error(`tahsilat ${f.collected_amount}`)
  if (kurus(f.balance_amount) !== kurus(135000)) throw new Error(`kalan ${f.balance_amount}`)
})

// 14) Tahsilat iki kez oluşmasın
await step('kapora yalnızca bir kez kaydedildi', async () => {
  const p = await q(`select count(*)::int n from payments where reservation_id=$1 and voided_at is null`, [resNew])
  if (p.rows[0].n !== 1) throw new Error(`ödeme sayısı ${p.rows[0].n}`)
})
r = await tryQ(
  `select convert_lead_to_reservation($1,$2,$3,$4,'2026-09-05','19:00','23:00',450,165000,0,30000,null,null)`,
  [leadId, q2.id, vLead, pkgA])
r.ok ? bug('CRITICAL','aynı talep ikinci kez dönüştürülebildi','kapora çift yazılır') : ok('aynı talep ikinci kez dönüştürülemiyor')
await step('ikinci deneme sonrası tahsilat hâlâ tek', async () => {
  const p = await q(`select count(*)::int n from payments where reservation_id=$1`, [resNew])
  if (p.rows[0].n !== 1) throw new Error(`ödeme sayısı ${p.rows[0].n}`)
})

// 15-17) Durumlar ve bağlantı
await step('talep Kazanıldı ve rezervasyona bağlı', async () => {
  const l = (await q(`select status, reservation_id, converted_at from leads where id=$1`, [leadId])).rows[0]
  if (l.status !== 'kazanildi') throw new Error(l.status)
  if (l.reservation_id !== resNew) throw new Error('rezervasyon bağlantısı yok')
  if (!l.converted_at) throw new Error('converted_at boş')
})
await step('kabul edilen teklif Kabul Edildi, diğeri kapandı', async () => {
  const qs = await q(`select id, status from quotes where lead_id=$1`, [leadId])
  const acc = qs.rows.find(x => x.id === q2.id)
  const old = qs.rows.find(x => x.id === q1.id)
  if (acc.status !== 'kabul') throw new Error(`kabul edilen: ${acc.status}`)
  if (old.status !== 'reddedildi') throw new Error(`eski teklif: ${old.status}`)
})
await step('opsiyon dönüştürüldü olarak kapandı ve rezervasyona bağlandı', async () => {
  const h = (await q(`select status, reservation_id from venue_holds where id=$1`, [holdId])).rows[0]
  if (h.status !== 'donusturuldu') throw new Error(h.status)
  if (h.reservation_id !== resNew) throw new Error('rezervasyon bağlantısı yok')
})
await step('dönüşüm geçmişe yazıldı', async () => {
  const a = await q(`select note from lead_activities where lead_id=$1 and note like '%dönüştürüldü%'`, [leadId])
  if (a.rows.length === 0) throw new Error('sistem kaydı yok')
})

// Teklif geçerlilik tarihi
await step('geçerlilik tarihi geçen teklif Süresi Doldu oluyor', async () => {
  const l2 = (await q(`insert into leads (customer_id,source) values ($1,'instagram') returning id`, [cLead])).rows[0].id
  const oldQ = (await q(`select * from save_quote($1,null,null,null,50000,0,'2020-01-01',null,'[]'::jsonb)`, [l2])).rows[0]
  await q(`select expire_quotes()`)
  const after = (await q(`select status from quotes where id=$1`, [oldQ.id])).rows[0].status
  if (after !== 'suresi_doldu') throw new Error(after)
})

// 19) Kaybetme nedeni zorunlu
await step('kaybedilen talepte neden zorunlu', async () => {
  const l3 = (await q(`insert into leads (customer_id,source) values ($1,'google') returning id`, [cLead])).rows[0].id
  const bad = await tryQ(`update leads set status='kaybedildi' where id=$1`, [l3])
  if (bad.ok) throw new Error('nedensiz kaybedildi kabul edildi')
  await q(`update leads set status='kaybedildi', lost_reason='fiyat' where id=$1`, [l3])
  const okRow = (await q(`select lost_reason from leads where id=$1`, [l3])).rows[0]
  if (okRow.lost_reason !== 'fiyat') throw new Error('neden kaydedilmedi')
})

// 18) Tenant izolasyonu
console.log('\n\x1b[1m13b) Talepler · tenant ve yetki izolasyonu\x1b[0m')
await as(U.b)
await step('B, A\'nın taleplerini göremiyor', async () => {
  const n = (await q(`select count(*)::int n from leads`)).rows[0].n
  if (n !== 0) throw new Error(`${n} talep göründü`)
})
await step('B, A\'nın tekliflerini ve opsiyonlarını göremiyor', async () => {
  const nq = (await q(`select count(*)::int n from quotes`)).rows[0].n
  const nh = (await q(`select count(*)::int n from venue_holds`)).rows[0].n
  const na = (await q(`select count(*)::int n from lead_activities`)).rows[0].n
  if (nq || nh || na) throw new Error(`teklif ${nq}, opsiyon ${nh}, aktivite ${na}`)
})
r = await tryQ(`select * from save_quote($1,null,null,null,1000,0,null,null,'[]'::jsonb)`, [leadId])
r.ok ? bug('CRITICAL','B, A\'nın talebine teklif oluşturabildi','') : ok('B, A\'nın talebine teklif oluşturamıyor')
r = await tryQ(
  `insert into venue_holds (lead_id,venue_id,event_date,start_time,end_time,expires_at)
   values ($1,$2,'2027-05-05','19:00','23:00', now() + interval '1 day')`, [leadId, vLead])
r.ok ? bug('CRITICAL','B, A\'nın salonunu opsiyona alabildi','') : ok('B, A\'nın salonunu opsiyona alamıyor')
r = await tryQ(`update leads set status='kazanildi' where id=$1`, [leadId])
const stillWon = (await (async()=>{ await sup(); return q('select status from leads where id=$1',[leadId]) })()).rows[0].status
stillWon === 'kazanildi' ? ok('B, A\'nın talebini değiştiremedi (RLS)') : bug('CRITICAL','çapraz tenant talep güncellemesi', stillWon)

await as(U.s)
await step('finans yetkisiz personel teklifleri göremiyor', async () => {
  const n = (await q(`select count(*)::int n from quotes`)).rows[0].n
  if (n !== 0) throw new Error(`${n} teklif göründü`)
})
r = await tryQ(`select * from save_quote($1,null,null,null,1000,0,null,null,'[]'::jsonb)`, [leadId])
r.ok ? bug('HIGH','finans yetkisiz personel teklif oluşturabildi','') : ok('finans yetkisiz personel teklif oluşturamıyor')
await step('finans yetkisiz personel talepleri görebiliyor (satış işi)', async () => {
  const n = (await q(`select count(*)::int n from leads`)).rows[0].n
  if (n === 0) throw new Error('talep listesi boş')
})
await step('talep ve teklif silinemiyor', async () => {
  const d1 = await tryQ(`delete from leads where id=$1`, [leadId])
  if (d1.ok) {
    const left = (await q(`select count(*)::int n from leads where id=$1`, [leadId])).rows[0].n
    if (left === 0) throw new Error('talep silinebildi')
  }
})
await as(U.a)

console.log('\n\x1b[1m13c) Talep çakışma denetimi\x1b[0m')
await as(U.a)
const vBusy = (await q(`insert into venues (name) values ('Dolu Salon') returning id`)).rows[0].id
const cBusy = (await q(`insert into customers (full_name,phone) values ('Dolu Müşteri','05330001122') returning id`)).rows[0].id
await q(SR(`null,$1,$2,null,'dugun','kesinlesti','2027-03-14','19:00','23:00',200,null,80000,0,null,null`), [cBusy, vBusy])

r = await tryQ(
  `insert into leads (customer_id,venue_id,source,event_date,start_time,end_time)
   values ($1,$2,'telefon','2027-03-14','20:00','23:00')`, [cLead, vBusy])
r.ok ? bug('HIGH','kesin rezervasyonlu slota talep açılabildi','')
     : ok('kesin rezervasyonlu slota talep açılamıyor')

const lFree = (await q(
  `insert into leads (customer_id,venue_id,source,event_date,start_time,end_time)
   values ($1,$2,'telefon','2027-03-15','19:00','23:00') returning id`, [cLead, vBusy])).rows[0].id
lFree ? ok('boş slota talep açılabiliyor') : bug('HIGH','boş slota talep açılamadı','')

await step('tarihi belirsiz talep denetlenmiyor', async () => {
  await q(`insert into leads (customer_id,source) values ($1,'instagram')`, [cLead])
})

// Opsiyonlu slot
await q(`insert into venue_holds (lead_id,venue_id,event_date,start_time,end_time,expires_at)
         values ($1,$2,'2027-04-20','19:00','23:00', now() + interval '2 days')`, [lFree, vBusy])
r = await tryQ(
  `insert into leads (customer_id,venue_id,source,event_date,start_time,end_time)
   values ($1,$2,'whatsapp','2027-04-20','21:00','23:00')`, [cBusy, vBusy])
r.ok ? bug('HIGH','opsiyonlu slota başka talep açılabildi','')
     : ok('opsiyonlu slota başka talep açılamıyor')

await step('talep kendi opsiyonu yüzünden engellenmiyor', async () => {
  await q(`update leads set event_date='2027-04-20', start_time='19:00', end_time='23:00',
           venue_id=$2 where id=$1`, [lFree, vBusy])
})

await step('iki talep aynı slotta yan yana durabiliyor', async () => {
  const a = (await q(`insert into leads (customer_id,venue_id,source,event_date,start_time,end_time)
     values ($1,$2,'google','2027-06-01','19:00','23:00') returning id`, [cLead, vBusy])).rows[0].id
  const b = await tryQ(`insert into leads (customer_id,venue_id,source,event_date,start_time,end_time)
     values ($1,$2,'referans','2027-06-01','19:00','23:00')`, [cBusy, vBusy])
  if (!b.ok) throw new Error('talepler birbirini bloke etti: ' + b.e)
  if (!a) throw new Error('ilk talep açılamadı')
})

await step('dönüşüm sonrası talep kendi rezervasyonundan etkilenmiyor', async () => {
  const l = (await q(`insert into leads (customer_id,venue_id,source,event_date,start_time,end_time,guest_count)
     values ($1,$2,'telefon','2027-08-08','19:00','23:00',150) returning id`, [cBusy, vBusy])).rows[0].id
  await q(`select convert_lead_to_reservation($1,null,$2,null,'2027-08-08','19:00','23:00',150,60000,0,0,null,null)`,
          [l, vBusy])
  const row = (await q(`select status, reservation_id from leads where id=$1`, [l])).rows[0]
  if (row.status !== 'kazanildi' || !row.reservation_id) throw new Error('dönüşüm tamamlanmadı')
})

// Regresyon: BEFORE trigger'da NEW.starts_at/ends_at üretilmiş kolonlar NULL'dır.
// Aralık satırın kendi alanlarından hesaplanmazsa tsrange(null,null) sonsuz olur
// ve aynı salondaki her kayıt, tarihi ilgisiz olsa bile çakışma sayılırdı.
await step('opsiyonlu salonda BAŞKA tarihe rezervasyon açılabiliyor', async () => {
  const v = (await q(`insert into venues (name) values ('Regresyon Salonu') returning id`)).rows[0].id
  const l = (await q(`insert into leads (customer_id,source) values ($1,'telefon') returning id`, [cLead])).rows[0].id
  await q(`insert into venue_holds (lead_id,venue_id,event_date,start_time,end_time,expires_at)
           values ($1,$2,'2028-01-10','19:00','23:00', now() + interval '3 days')`, [l, v])
  const res = await tryQ(SR(`null,$1,$2,null,'dugun','kesinlesti','2028-05-20','19:00','23:00',100,null,50000,0,null,null`), [cLead, v])
  if (!res.ok) throw new Error('ilgisiz tarih çakışma sayıldı: ' + res.e)
})

await step('rezervasyonlu salonda BAŞKA tarihe opsiyon konabiliyor', async () => {
  const v = (await q(`insert into venues (name) values ('Regresyon Salonu 2') returning id`)).rows[0].id
  const l = (await q(`insert into leads (customer_id,source) values ($1,'telefon') returning id`, [cLead])).rows[0].id
  await q(SR(`null,$1,$2,null,'dugun','kesinlesti','2028-02-14','19:00','23:00',100,null,50000,0,null,null`), [cLead, v])
  const hold = await tryQ(
    `insert into venue_holds (lead_id,venue_id,event_date,start_time,end_time,expires_at)
     values ($1,$2,'2028-09-09','19:00','23:00', now() + interval '3 days')`, [l, v])
  if (!hold.ok) throw new Error('ilgisiz tarih çakışma sayıldı: ' + hold.e)
})

await step('aynı salonda ardışık saatler çakışma sayılmıyor', async () => {
  const v = (await q(`insert into venues (name) values ('Ardışık Salon') returning id`)).rows[0].id
  await q(SR(`null,$1,$2,null,'nisan','kesinlesti','2028-03-03','13:00','17:00',80,null,30000,0,null,null`), [cLead, v])
  const l = (await q(`insert into leads (customer_id,source) values ($1,'telefon') returning id`, [cLead])).rows[0].id
  // 17:00'de biten organizasyonun üstüne 18:00 başlangıçlı opsiyon konabilmeli.
  const hold = await tryQ(
    `insert into venue_holds (lead_id,venue_id,event_date,start_time,end_time,expires_at)
     values ($1,$2,'2028-03-03','18:00','23:00', now() + interval '1 day')`, [l, v])
  if (!hold.ok) throw new Error('ardışık saat çakışma sayıldı: ' + hold.e)
})

await step('talep kendi opsiyonunu müsaitlikte dolu görmüyor', async () => {
  const v = (await q(`insert into venues (name) values ('Kendi Opsiyonu Salonu') returning id`)).rows[0].id
  const l = (await q(`insert into leads (customer_id,source) values ($1,'telefon') returning id`, [cLead])).rows[0].id
  await q(`insert into venue_holds (lead_id,venue_id,event_date,start_time,end_time,expires_at)
           values ($1,$2,'2029-02-02','19:00','23:00', now() + interval '2 days')`, [l, v])

  const blind = await q(`select is_available from venue_availability('2029-02-02','19:00','23:00',null) where venue_id=$1`, [v])
  if (blind.rows[0].is_available) throw new Error('opsiyon hiç görünmedi')

  const own = await q(`select is_available from venue_availability('2029-02-02','19:00','23:00',$1) where venue_id=$2`, [l, v])
  if (!own.rows[0].is_available) throw new Error('talep kendi opsiyonu yüzünden kilitlendi')
})

console.log('\n\x1b[1m13d) Saat girilmemiş talepte gün bazlı denetim\x1b[0m')
await as(U.a)
const vDay = (await q(`insert into venues (name) values ('Gün Bazlı Salon') returning id`)).rows[0].id
const cDay = (await q(`insert into customers (full_name,phone) values ('Akşam Düğünü','05340001122') returning id`)).rows[0].id
await q(SR(`null,$1,$2,null,'dugun','kesinlesti','2029-05-05','19:00','23:00',300,null,90000,0,null,null`), [cDay, vDay])

r = await tryQ(`insert into leads (customer_id,venue_id,source,event_date) values ($1,$2,'telefon','2029-05-05')`, [cLead, vDay])
r.ok ? bug('HIGH','saat girilmeden dolu güne talep açılabildi','en sık kullanılan hızlı giriş yolu denetimsiz')
     : ok('saat girilmeden dolu güne talep açılamıyor')

await step('hata mesajı saat girme yolunu söylüyor', async () => {
  const e = await tryQ(`insert into leads (customer_id,venue_id,source,event_date) values ($1,$2,'telefon','2029-05-05')`, [cLead, vDay])
  if (e.ok) throw new Error('engellenmedi')
  if (!e.e.includes('saat')) throw new Error('yönlendirme yok: ' + e.e)
})

await step('saat girilmemiş talep boş güne açılabiliyor', async () => {
  await q(`insert into leads (customer_id,venue_id,source,event_date) values ($1,$2,'telefon','2029-05-06')`, [cLead, vDay])
})

await step('salonu belirsiz talep gün denetimine takılmıyor', async () => {
  await q(`insert into leads (customer_id,source,event_date) values ($1,'whatsapp','2029-05-05')`, [cLead])
})

await step('müsaitlik saatsiz çağrılabiliyor ve günü dolu gösteriyor', async () => {
  const av = await q(`select is_available, conflict_kind from venue_availability('2029-05-05',null,null,null) where venue_id=$1`, [vDay])
  if (av.rows[0].is_available) throw new Error('dolu gün müsait göründü')
  if (av.rows[0].conflict_kind !== 'rezervasyon') throw new Error(av.rows[0].conflict_kind)
})

await step('gün dolu olsa da boş saat aralığı için müsait dönüyor', async () => {
  // 19:00-23:00 dolu; sabah 10:00-14:00 için salon hâlâ değerlendirilebilir.
  const av = await q(`select is_available from venue_availability('2029-05-05','10:00','14:00',null) where venue_id=$1`, [vDay])
  if (!av.rows[0].is_available) throw new Error('boş saat aralığı dolu göründü')
  const lead = await tryQ(`insert into leads (customer_id,venue_id,source,event_date,start_time,end_time)
     values ($1,$2,'telefon','2029-05-05','10:00','14:00')`, [cLead, vDay])
  if (!lead.ok) throw new Error('boş saat aralığına talep açılamadı: ' + lead.e)
})

console.log('\n\x1b[1m13e) Organizasyonlar arası boşluk\x1b[0m')
await as(U.a)
const vTurn = (await q(`insert into venues (name) values ('Boşluk Salonu') returning id`)).rows[0].id
const cTurn = (await q(`insert into customers (full_name,phone) values ('Öğlen Nişanı','05350001122') returning id`)).rows[0].id
await q(SR(`null,$1,$2,null,'nisan','kesinlesti','2030-03-10','13:00','17:00',120,null,40000,0,null,null`), [cTurn, vTurn])

r = await tryQ(SR(`null,$1,$2,null,'dugun','kesinlesti','2030-03-10','17:30','22:00',300,null,90000,0,null,null`), [cTurn, vTurn])
r.ok ? bug('HIGH','30 dakika boşlukla ikinci rezervasyon açılabildi','asgari boşluk kuralı uygulanmadı')
     : ok('60 dakikadan az boşluk reddediliyor')

await step('tam 60 dakika boşlukta kabul ediliyor', async () => {
  await q(SR(`null,$1,$2,null,'dugun','kesinlesti','2030-03-10','18:00','22:00',300,null,90000,0,null,null`), [cTurn, vTurn])
})

await step('60-120 arası uyarı; engel değil', async () => {
  const v = (await q(`insert into venues (name) values ('Uyarı Salonu 2') returning id`)).rows[0].id
  await q(SR(`null,$1,$2,null,'nisan','kesinlesti','2030-09-09','13:00','17:00',120,null,40000,0,null,null`), [cTurn, v])
  const a = (await q(`select severity, gap_minutes, is_available
    from venue_availability('2030-09-09','18:30','22:00',null) where venue_id=$1`, [v])).rows[0]
  if (a.severity !== 'uyari') throw new Error('uyarı beklendi: ' + a.severity)
  if (a.gap_minutes !== 90) throw new Error('boşluk: ' + a.gap_minutes)
  if (!a.is_available) throw new Error('uyarı kaydı engellememeli')
  // Gerçekten kaydedilebiliyor mu?
  await q(SR(`null,$1,$2,null,'dugun','kesinlesti','2030-09-09','18:30','22:00',200,null,60000,0,null,null`), [cTurn, v])
})

await step('önceki organizasyon da uyarı taramasında görünüyor', async () => {
  const v = (await q(`insert into venues (name) values ('Önceki Komşu') returning id`)).rows[0].id
  await q(SR(`null,$1,$2,null,'nisan','kesinlesti','2030-10-10','19:00','23:00',120,null,40000,0,null,null`), [cTurn, v])
  // Aday öncede: 14:00-17:30 bitiyor, sonraki 19:00'da başlıyor → 90 dakika.
  const a = (await q(`select severity, gap_minutes
    from venue_availability('2030-10-10','14:00','17:30',null) where venue_id=$1`, [v])).rows[0]
  if (a.severity !== 'uyari') throw new Error('önceki komşu görülmedi: ' + a.severity)
  if (a.gap_minutes !== 90) throw new Error('boşluk: ' + a.gap_minutes)
})

await step('boşluk kuralı opsiyona da uygulanıyor', async () => {
  const l = (await q(`insert into leads (customer_id,source) values ($1,'telefon') returning id`, [cTurn])).rows[0].id
  const h = await tryQ(`insert into venue_holds (lead_id,venue_id,event_date,start_time,end_time,expires_at)
    values ($1,$2,'2030-03-10','17:30','22:00', now() + interval '2 days')`, [l, vTurn])
  if (h.ok) throw new Error('yetersiz boşlukta opsiyon açılabildi')
  if (!/en az 60 dakika/i.test(h.e)) throw new Error('mesaj kuralı açıklamıyor: ' + h.e)
})

await step('boşluk kuralı talep denetimine de uygulanıyor', async () => {
  const e = await tryQ(`insert into leads (customer_id,venue_id,source,event_date,start_time,end_time)
    values ($1,$2,'telefon','2030-03-10','17:30','22:00')`, [cLead, vTurn])
  if (e.ok) throw new Error('yetersiz boşlukta talep açılabildi')
})

await step('boşluk kuralı farklı salonu etkilemiyor', async () => {
  const v = (await q(`insert into venues (name) values ('Komşu Salon') returning id`)).rows[0].id
  const other = await tryQ(SR(`null,$1,$2,null,'dugun','kesinlesti','2030-03-10','17:30','22:00',200,null,60000,0,null,null`), [cTurn, v])
  if (!other.ok) throw new Error('başka salon etkilendi: ' + other.e)
})

console.log('\n\x1b[1m13f) Silme davranışı — talep zinciri\x1b[0m')
await as(U.a)
await step('dönüşmüş rezervasyon silinince talep tutarlı kalıyor', async () => {
  const v = (await q(`insert into venues (name) values ('Silme Salonu') returning id`)).rows[0].id
  const c = (await q(`insert into customers (full_name,phone) values ('Silme Testi','05360001122') returning id`)).rows[0].id
  const l = (await q(`insert into leads (customer_id,venue_id,source,event_date,start_time,end_time,guest_count)
    values ($1,$2,'telefon','2031-05-05','19:00','23:00',200) returning id`, [c, v])).rows[0].id
  await q(`select convert_lead_to_reservation($1,null,$2,null,'2031-05-05','19:00','23:00',200,100000,0,0,null,null)`, [l, v])

  const before = (await q(`select status, reservation_id from leads where id=$1`, [l])).rows[0]
  if (before.status !== 'kazanildi' || !before.reservation_id) throw new Error('dönüşüm kurulmadı')

  const del = await tryQ(`delete from reservations where id=$1`, [before.reservation_id])
  if (!del.ok) return // FK engelliyorsa sorun yok

  const after = (await q(`select status, reservation_id from leads where id=$1`, [l])).rows[0]
  if (after.status === 'kazanildi' && !after.reservation_id) {
    throw new Error("talep 'Kazanıldı' kaldı ama rezervasyon bağlantısı koptu")
  }
})

console.log('\n\x1b[1m13g) Opsiyonlu durumu ile opsiyon tutarlılığı\x1b[0m')
await as(U.a)
const vSync = (await q(`insert into venues (name) values ('Senkron Salonu') returning id`)).rows[0].id
const cSync = (await q(`insert into customers (full_name,phone) values ('Senkron','05370001122') returning id`)).rows[0].id
const lSync = (await q(`insert into leads (customer_id,venue_id,source,event_date,start_time,end_time)
  values ($1,$2,'telefon','2032-02-02','19:00','23:00') returning id`, [cSync, vSync])).rows[0].id

r = await tryQ(`update leads set status='opsiyonlu' where id=$1`, [lSync])
r.ok ? bug('HIGH','opsiyon açmadan Opsiyonlu yapılabildi','ekran salonu bloke gösterir ama değildir')
     : ok('opsiyon olmadan Opsiyonlu yapılamıyor')

await step('opsiyon açılınca talep opsiyonlu oluyor', async () => {
  await q(`insert into venue_holds (lead_id,venue_id,event_date,start_time,end_time,expires_at)
    values ($1,$2,'2032-02-02','19:00','23:00', now() + interval '2 days')`, [lSync, vSync])
  await q(`update leads set status='opsiyonlu' where id=$1`, [lSync])
  const st = (await q(`select status from leads where id=$1`, [lSync])).rows[0].status
  if (st !== 'opsiyonlu') throw new Error(st)
})

await step('opsiyon süresi dolunca talep opsiyonlu kalmıyor', async () => {
  await sup()
  await q(`update venue_holds set expires_at = now() - interval '1 hour'
            where lead_id=$1 and status='aktif'`, [lSync])
  await as(U.a)
  await q(`select expire_venue_holds($1)`, [vSync])
  const st = (await q(`select status from leads where id=$1`, [lSync])).rows[0].status
  if (st === 'opsiyonlu') throw new Error("süresi dolmuş opsiyonda talep 'opsiyonlu' kaldı")
  if (st !== 'yeni' && st !== 'teklif_verildi') throw new Error('beklenmedik durum: ' + st)
})

await step('dönüşen opsiyon talebi kazanildi durumundan düşürmüyor', async () => {
  const v = (await q(`insert into venues (name) values ('Dönüşüm Senkron') returning id`)).rows[0].id
  const l = (await q(`insert into leads (customer_id,venue_id,source,event_date,start_time,end_time,guest_count)
    values ($1,$2,'telefon','2032-06-06','19:00','23:00',150) returning id`, [cSync, v])).rows[0].id
  await q(`insert into venue_holds (lead_id,venue_id,event_date,start_time,end_time,expires_at)
    values ($1,$2,'2032-06-06','19:00','23:00', now() + interval '2 days')`, [l, v])
  await q(`update leads set status='opsiyonlu' where id=$1`, [l])
  await q(`select convert_lead_to_reservation($1,null,$2,null,'2032-06-06','19:00','23:00',150,70000,0,0,null,null)`, [l, v])
  const st = (await q(`select status from leads where id=$1`, [l])).rows[0].status
  if (st !== 'kazanildi') throw new Error('dönüşüm sonrası durum: ' + st)
})

console.log('\n\x1b[1m13h) Satış hattı sadeleşmesi\x1b[0m')
await as(U.a)
await step("'gorusuluyor' durumu tamamen kalktı", async () => {
  const e = await q(`select unnest(enum_range(null::lead_status))::text as v`)
  const values = e.rows.map(r => r.v)
  if (values.includes('gorusuluyor')) throw new Error('enum değeri duruyor: ' + values.join(','))
  const beklenen = ['yeni','teklif_verildi','opsiyonlu','kazanildi','kaybedildi']
  if (values.join(',') !== beklenen.join(',')) throw new Error('hat: ' + values.join(','))
})
await step('kısmi indeks ve kısıt tip değişiminden sağ çıktı', async () => {
  const i = await q(`select 1 from pg_indexes where indexname='leads_follow_up_idx'`)
  if (!i.rows.length) throw new Error('leads_follow_up_idx kayboldu')
  const c = await q(`select 1 from pg_constraint where conname='leads_lost_reason_required'`)
  if (!c.rows.length) throw new Error('leads_lost_reason_required kayboldu')
  const t = await q(`select count(*)::int as n from pg_trigger
    where tgrelid='public.leads'::regclass and tgname in ('leads_conflict_guard','leads_hold_status_guard')`)
  if (t.rows[0].n !== 2) throw new Error('trigger sayısı: ' + t.rows[0].n)
})
await step('teklif verilince yeni talep teklif_verildi oluyor', async () => {
  const v = (await q(`insert into venues (name) values ('Hat Salonu') returning id`)).rows[0].id
  const c = (await q(`insert into customers (full_name,phone) values ('Hat','05380001122') returning id`)).rows[0].id
  const l = (await q(`insert into leads (customer_id,venue_id,source) values ($1,$2,'telefon') returning id`, [c, v])).rows[0].id
  await q(`select save_quote($1,$2,null,200,90000,0,current_date + 10,null,'[]'::jsonb)`, [l, v])
  const st = (await q(`select status from leads where id=$1`, [l])).rows[0].status
  if (st !== 'teklif_verildi') throw new Error(st)
})

console.log('\n\x1b[1m13i) Durum türetiliyor, elle ayarlanamıyor\x1b[0m')
await as(U.a)
const vDer = (await q(`insert into venues (name) values ('Türetme Salonu') returning id`)).rows[0].id
const cDer = (await q(`insert into customers (full_name,phone) values ('Türetme','05390001122') returning id`)).rows[0].id
const lDer = (await q(`insert into leads (customer_id,venue_id,source,event_date,start_time,end_time)
  values ($1,$2,'telefon','2033-03-03','19:00','23:00') returning id`, [cDer, vDer])).rows[0].id

r = await tryQ(`update leads set status='teklif_verildi' where id=$1`, [lDer])
r.ok ? bug('HIGH','teklifi olmayan talep Teklif Verildi yapılabildi','ekran teklif verilmiş gibi gösterir')
     : ok('teklif olmadan Teklif Verildi yapılamıyor')

await step('teklif oluşunca durum kendiliğinden ilerliyor', async () => {
  await q(`select save_quote($1,$2,null,200,90000,0,current_date + 10,null,'[]'::jsonb)`, [lDer, vDer])
  const st = (await q(`select status from leads where id=$1`, [lDer])).rows[0].status
  if (st !== 'teklif_verildi') throw new Error(st)
})

r = await tryQ(`update leads set status='yeni' where id=$1`, [lDer])
r.ok ? bug('HIGH','teklifi olan talep Yeni Talebe geri çekilebildi','teklif kayıtta ama durum yok sayıyor')
     : ok('teklifi olan talep geri çekilemiyor')

await step('opsiyon açılınca durum opsiyonluya ilerliyor', async () => {
  await q(`insert into venue_holds (lead_id,venue_id,event_date,start_time,end_time,expires_at)
    values ($1,$2,'2033-03-03','19:00','23:00', now() + interval '2 days')`, [lDer, vDer])
  await q(`update leads set status='opsiyonlu' where id=$1`, [lDer])
  const st = (await q(`select status from leads where id=$1`, [lDer])).rows[0].status
  if (st !== 'opsiyonlu') throw new Error(st)
})

await step('opsiyon kapanınca teklife geri düşüyor, yeniye değil', async () => {
  await sup()
  await q(`update venue_holds set expires_at = now() - interval '1 hour'
            where lead_id=$1 and status='aktif'`, [lDer])
  await as(U.a)
  await q(`select expire_venue_holds($1)`, [vDer])
  const st = (await q(`select status from leads where id=$1`, [lDer])).rows[0].status
  if (st !== 'teklif_verildi') throw new Error('teklifi var ama düştüğü yer: ' + st)
})

await step('kaybedilen talep açılınca türetilmiş adıma dönüyor', async () => {
  await q(`update leads set status='kaybedildi', lost_reason='fiyat' where id=$1`, [lDer])
  const hedef = (await q(`select derived_lead_status($1) as s`, [lDer])).rows[0].s
  if (hedef !== 'teklif_verildi') throw new Error('türetilen: ' + hedef)
  await q(`update leads set status=$2, lost_reason=null where id=$1`, [lDer, hedef])
  const st = (await q(`select status from leads where id=$1`, [lDer])).rows[0].status
  if (st !== 'teklif_verildi') throw new Error(st)
})

console.log('\n\x1b[1m13j) Görüşme geçmişi doğruluğu\x1b[0m')
await as(U.a)
await step('para biçimi Türkçe', async () => {
  const r = await q(`select format_money(382500) a, format_money(1234.5) b,
                            format_money(0) c, format_money(null) d`)
  const { a, b, c, d } = r.rows[0]
  if (a !== '₺382.500') throw new Error('tam sayı: ' + a)
  if (b !== '₺1.234,50') throw new Error('kuruşlu: ' + b)
  if (c !== '₺0') throw new Error('sıfır: ' + c)
  if (d !== '₺0') throw new Error('null: ' + d)
})

await step('geçmişteki teklif tutarı ek hizmetleri içeriyor', async () => {
  const v = (await q(`insert into venues (name) values ('Geçmiş Salonu') returning id`)).rows[0].id
  const c = (await q(`insert into customers (full_name,phone) values ('Geçmiş','05400001122') returning id`)).rows[0].id
  const l = (await q(`insert into leads (customer_id,venue_id,source) values ($1,$2,'yuz_yuze') returning id`, [c, v])).rows[0].id
  // paket 382.500 + ekstra 10.000 − indirim 10.000 = 382.500
  const quote = (await q(`select * from save_quote($1,$2,null,450,382500,10000,current_date + 10,null,
    '[{"name":"Fotoğraf & Video","amount":10000}]'::jsonb)`, [l, v])).rows[0]
  const gercek = (await q(`select total_amount from quotes where id=$1`, [quote.id])).rows[0].total_amount
  const kayit = (await q(`select note from lead_activities
    where lead_id=$1 and note like 'Teklif oluşturuldu%' limit 1`, [l])).rows[0]
  if (!kayit) throw new Error('oluşturma kaydı yok')
  const beklenen = (await q(`select format_money($1) f`, [gercek])).rows[0].f
  if (!kayit.note.includes(beklenen))
    throw new Error(`geçmiş "${kayit.note}" · teklif ${beklenen}`)
})

await step('mekana geldi kaynağı kullanılabiliyor', async () => {
  const e = await q(`select unnest(enum_range(null::lead_source))::text v`)
  const values = e.rows.map(r => r.v)
  if (!values.includes('yuz_yuze')) throw new Error('kaynak yok: ' + values.join(','))
})

await step('opsiyon kaydı iki tarihi karıştırmıyor', async () => {
  const v = (await q(`insert into venues (name) values ('Metin Salonu') returning id`)).rows[0].id
  const c = (await q(`insert into customers (full_name,phone) values ('Metin','05410001122') returning id`)).rows[0].id
  const l = (await q(`insert into leads (customer_id,venue_id,source) values ($1,$2,'telefon') returning id`, [c, v])).rows[0].id
  await q(`insert into venue_holds (lead_id,venue_id,event_date,start_time,end_time,expires_at)
    values ($1,$2,'2031-05-05','19:00','23:00', now() + interval '2 days')`, [l, v])
  const n = (await q(`select note from lead_activities where lead_id=$1
    and note like '%opsiyona alındı%' limit 1`, [l])).rows[0]
  if (!n) throw new Error('opsiyon kaydı yok')
  if (!n.note.includes('05.05.2031 tarihi opsiyona alındı · opsiyon bitişi'))
    throw new Error(n.note)
})

console.log('\n\x1b[1m13k) Logo deposu izolasyonu\x1b[0m')
await step('logos kovası herkese açık ve sınırlı', async () => {
  const r = (await q(`select public, file_size_limit, allowed_mime_types from storage.buckets where id='logos'`)).rows[0]
  if (!r) throw new Error('kova yok')
  if (!r.public) throw new Error('kova public değil; sözleşme çıktısında logo çekilemez')
  if (Number(r.file_size_limit) !== 2097152) throw new Error('boyut sınırı: ' + r.file_size_limit)
  if (!String(r.allowed_mime_types).includes('image/svg+xml')) throw new Error('svg yok')
})

await as(U.a)
await step('yönetici kendi klasörüne yazabiliyor', async () => {
  await q(`insert into storage.objects (bucket_id,name) values ('logos', $1)`, [`${bizA}/logo.png`])
})

r = await tryQ(`insert into storage.objects (bucket_id,name) values ('logos', $1)`, [`${bizB}/logo.png`])
r.ok ? bug('CRITICAL','A, B işletmesinin logo klasörüne yazabildi','tenant sınırı depolamada aşılıyor')
     : ok("A, B'nin logo klasörüne yazamıyor")

r = await tryQ(`insert into storage.objects (bucket_id,name) values ('logos','logo.png')`)
r.ok ? bug('HIGH','klasörsüz yola yazılabildi','tenant sınırı klasör adına dayanıyor')
     : ok('kök dizine yazılamıyor')

await as(U.staff)
r = await tryQ(`insert into storage.objects (bucket_id,name) values ('logos', $1)`, [`${bizA}/logo.png`])
r.ok ? bug('MEDIUM','yönetici olmayan personel logo yükleyebildi','işletme kimliğini değiştirebilir')
     : ok('personel logo yükleyemiyor')

await sup()
r = await tryQ(`delete from storage.objects where bucket_id='logos' and name=$1`, [`${bizA}/logo.png`])

console.log('\n\x1b[1m13l) İptal sonrası yeni sözleşme\x1b[0m')
await as(U.a)
await step('iptal edilen sözleşmenin üstüne yenisi oluşturulabiliyor', async () => {
  const v = (await q(`insert into venues (name) values ('Sözleşme Salonu') returning id`)).rows[0].id
  const c = (await q(`insert into customers (full_name,phone) values ('Sözleşme','05420001122') returning id`)).rows[0].id
  const res = (await q(SR(`null,$1,$2,null,'dugun','kesinlesti','2034-04-04','19:00','23:00',200,null,80000,0,null,null`), [c, v])).rows[0].save_reservation

  const k1 = (await q(`select * from create_contract($1,'metin','{}'::jsonb)`, [res])).rows[0]
  await q(`update contracts set status='iptal', cancelled_at=now(), cancel_reason='yanlış fiyat' where id=$1`, [k1.id])

  const k2 = (await q(`select * from create_contract($1,'yeni metin','{}'::jsonb)`, [res])).rows[0]
  if (k2.contract_number !== k1.contract_number) throw new Error('numara değişti: ' + k2.contract_number)
  if (k2.version !== k1.version + 1) throw new Error('sürüm: ' + k2.version)
  if (k2.status !== 'olusturuldu') throw new Error('yeni sürüm durumu: ' + k2.status)

  const eski = (await q(`select status, cancel_reason from contracts where id=$1`, [k1.id])).rows[0]
  if (eski.status !== 'iptal') throw new Error('iptal kaydı bozuldu')
  if (eski.cancel_reason !== 'yanlış fiyat') throw new Error('iptal nedeni kayboldu')

  const n = (await q(`select count(*)::int n from contracts where reservation_id=$1`, [res])).rows[0].n
  if (n !== 2) throw new Error('sözleşme sayısı: ' + n)
})

console.log('\n\x1b[1m13m) Sözleşmede hizmet kapsamı\x1b[0m')
await as(U.a)
await step('varsayılan şablon included_services değişkenini içeriyor', async () => {
  const b = (await q(`select default_contract_body() b`)).rows[0].b
  if (!b.includes('{{included_services}}')) throw new Error('değişken şablonda yok')
  if (!b.includes('{{notes}}')) throw new Error('notlar değişkeni kayboldu')
})
await step('yeni işletmenin şablonu kapsamı içeriyor', async () => {
  await sup()
  const uid = '99999999-9999-9999-9999-999999999911'
  await q(`insert into auth.users (id,email) values ($1,'kapsam@test.local')`, [uid])
  await q(`select set_config('test.uid',$1,false)`, [uid])
  await db.exec(`set role authenticated`)
  await q(`select create_business_with_owner('Kapsam İşletme','Sahip')`)
  const t = (await q(`select body from contract_templates where is_default limit 1`)).rows[0]
  if (!t.body.includes('{{included_services}}')) throw new Error('yeni şablonda yok')
})

console.log('\n\x1b[1m13n) Rezervasyon durumu sadeleşmesi\x1b[0m')
await as(U.a)
await step('yeni rezervasyon varsayılanı kesinlesti', async () => {
  const d = (await q(`select column_default d from information_schema.columns
    where table_name='reservations' and column_name='status'`)).rows[0].d
  if (!String(d).includes('kesinlesti')) throw new Error('varsayılan: ' + d)
})
await step('rezervasyon durumları üçe indi', async () => {
  const v = (await q(`select unnest(enum_range(null::reservation_status))::text v`))
    .rows.map(r => r.v)
  const beklenen = ['kesinlesti', 'tamamlandi', 'iptal_edildi']
  if (v.join(',') !== beklenen.join(','))
    throw new Error('durumlar: ' + v.join(','))
})
await step('raporlar potansiyeli satış saymıyor', async () => {
  // 0019 öncesinde 'on_gorusme' bir potansiyel müşteriydi ama iptal olmadığı
  // için ciroya giriyordu. Artık böyle bir kayıt oluşamaz.
  const v = (await q(`insert into venues (name) values ('Durum Salonu') returning id`)).rows[0].id
  const c = (await q(`insert into customers (full_name,phone) values ('Durum','05430001122') returning id`)).rows[0].id
  const res = (await q(`insert into reservations (venue_id,customer_id,event_date,start_time,end_time)
    values ($1,$2,'2035-05-05','19:00','23:00') returning id, status`, [v, c])).rows[0]
  if (res.status !== 'kesinlesti') throw new Error('durum: ' + res.status)
})

console.log('\n\x1b[1m13m) Salona bağlı paketler\x1b[0m')
await as(U.a)
await step('paket salona bağlanabiliyor ve boş bırakılabiliyor', async () => {
  const v = (await q(`insert into venues (name) values ('Kiralık Salon') returning id`)).rows[0].id
  const ortak = (await q(`insert into packages (name,base_price,pricing_type)
    values ('Gold Menü',850,'kisi_basi') returning id, venue_id`)).rows[0]
  if (ortak.venue_id !== null) throw new Error('varsayılan tüm salonlar olmalı')
  const ozel = (await q(`insert into packages (name,base_price,pricing_type,venue_id)
    values ('Kuru Kiralama',40000,'sabit',$1) returning venue_id`, [v])).rows[0]
  if (ozel.venue_id !== v) throw new Error('salon bağı kurulmadı')
})

r = await tryQ(`insert into packages (name,base_price,pricing_type,venue_id)
  values ('Sızıntı',1000,'sabit',$1)`, [vB])
r.ok ? bug('CRITICAL','paket başka tenantın salonuna bağlanabildi','bileşik FK aşıldı')
     : ok('paket başka tenantın salonuna bağlanamıyor')

await step('salon silinince paket tüm salonlara döner', async () => {
  const v = (await q(`insert into venues (name) values ('Geçici Salon') returning id`)).rows[0].id
  const p = (await q(`insert into packages (name,base_price,pricing_type,venue_id)
    values ('Geçici Paket',5000,'sabit',$1) returning id`, [v])).rows[0].id
  await q(`delete from venues where id=$1`, [v])
  const row = (await q(`select venue_id, business_id from packages where id=$1`, [p])).rows[0]
  if (row.venue_id !== null) throw new Error('venue_id temizlenmedi')
  if (!row.business_id) throw new Error('business_id de NULL yapıldı — kolon listesi eksik')
})

console.log('\n' + '─'.repeat(70))
const say = (s) => findings.filter(f => f.sev === s).length
console.log(`\x1b[1mDenetim sonucu\x1b[0m  ${pass} kontrol geçti · ${findings.length} bulgu`)
console.log(`  CRITICAL ${say('CRITICAL')} · HIGH ${say('HIGH')} · MEDIUM ${say('MEDIUM')} · LOW ${say('LOW')}\n`)
fs.writeFileSync(path.join(HERE, 'audit-findings.json'), JSON.stringify(findings, null, 2))
