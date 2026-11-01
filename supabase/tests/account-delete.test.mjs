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
const step = async (n, fn) => { try { await fn(); ok(n) } catch (e) { bad(n, e.message) } }
const expectFail = async (n, fn, match) => {
  try { await fn(); bad(n, 'hata bekleniyordu') } catch (e) { e.message.includes(match) ? ok(`${n} (engellendi)`) : bad(n, e.message) }
}
const as = async (uid) => { await db.exec('reset role'); await db.query(`select set_config('test.uid', $1, false)`, [uid ?? '']); await db.exec('set role authenticated') }
const sup = () => db.exec('reset role')
const count = async (t, where = '') => (await db.query(`select count(*)::int c from ${t} ${where}`)).rows[0].c

console.log('\n\x1b[1mHesap silme (delete_my_account)\x1b[0m')
await db.exec(fs.readFileSync(path.join(HERE, 'supabase-stub.sql'), 'utf8'))
for (const f of fs.readdirSync(MIG).sort()) await db.exec(fs.readFileSync(path.join(MIG, f), 'utf8'))

const U = { ownerA: '11111111-1111-1111-1111-111111111111', ownerB: '22222222-2222-2222-2222-222222222222', staffA: '33333333-3333-3333-3333-333333333333', solo: '44444444-4444-4444-4444-444444444444' }
await sup()
for (const [k, v] of Object.entries(U)) await db.query('insert into auth.users (id, email) values ($1, $2)', [v, `${k}@t.local`])

await as(U.ownerA); await db.query(`select create_business_with_owner('A Salon', 'A Sahip')`)
await as(U.ownerB); await db.query(`select create_business_with_owner('B Salon', 'B Sahip')`)
await as(U.solo);   await db.query(`select create_business_with_owner('Tek Kişi', 'Tek')`)
await sup()
const bizA = (await db.query(`select business_id from profiles where id=$1`, [U.ownerA])).rows[0].business_id
await db.query(`insert into profiles (id, business_id, full_name, role) values ($1,$2,'Personel','staff')`, [U.staffA, bizA])

// "solo" işletmesine tam veri zinciri: salon, müşteri, rezervasyon, tahsilat, gider, talep, teklif, sözleşme
await as(U.solo)
const venue = (await db.query(`insert into venues (business_id, name, color) values ((select business_id from profiles where id=$1), 'Salon', '#112233') returning id`, [U.solo])).rows[0].id
const biz = (await db.query(`select business_id from profiles where id=$1`, [U.solo])).rows[0].business_id
const cust = (await db.query(`insert into customers (business_id, full_name, phone) values ($1,'Müşteri','05320000000') returning id`, [biz])).rows[0].id
await sup()
const res = (await db.query(`insert into reservations (business_id, venue_id, customer_id, event_date, start_time, end_time, organization_type, status) values ($1,$2,$3,'2030-01-10','10:00','14:00','dugun','kesinlesti') returning id`, [biz, venue, cust])).rows[0].id
// Bağlı kayıtlar: bunlar RESTRICT olduğu için silme sırasını gerçekten sınar. Örnek atlanırsa test BAŞARISIZ olur.
// Tahsilat için rezervasyon fiyatı > 0 olmalı (tetikleyici); fiyat satırı varsa güncellenir, yoksa eklenir.
await db.query(`insert into reservation_pricing (business_id, reservation_id, package_amount, gross_amount, discount_amount) values ($1,$2,1000,1000,0) on conflict (reservation_id) do update set package_amount = 1000, gross_amount = 1000`, [biz, res])
await db.query(`insert into payments (business_id, reservation_id, customer_id, amount) values ($1,$2,$3,10)`, [biz, res, cust])
const cat = (await db.query(`select id from expense_categories where business_id=$1 limit 1`, [biz])).rows[0].id
await db.query(`insert into expenses (business_id, category_id, reservation_id, amount) values ($1,$2,$3,5)`, [biz, cat, res])
await db.query(`insert into leads (business_id, customer_id, status) values ($1,$2,'yeni')`, [biz, cust])

await as(null)
await expectFail('oturumsuz çağrı reddedilir', () => db.query('select delete_my_account()'), 'Oturum')

await as(U.ownerA)
await expectFail('başka kullanıcısı olan sahip silemez', () => db.query('select delete_my_account()'), 'başka kullanıcılar')
await sup()
await step('reddedilen silme hiçbir şeyi silmedi', async () => {
  if ((await count('auth.users', `where id='${U.ownerA}'`)) !== 1) throw new Error('kullanıcı silinmiş')
  if ((await count('businesses', `where id='${bizA}'`)) !== 1) throw new Error('işletme silinmiş')
})

await as(U.staffA)
await step('personel kendi hesabını siler', () => db.query('select delete_my_account()'))
await sup()
await step('personel gitti, işletme ve sahibi duruyor', async () => {
  if ((await count('auth.users', `where id='${U.staffA}'`)) !== 0) throw new Error('personel kalmış')
  if ((await count('profiles', `where id='${U.staffA}'`)) !== 0) throw new Error('profil kalmış')
  if ((await count('businesses', `where id='${bizA}'`)) !== 1) throw new Error('işletme silinmiş')
  if ((await count('profiles', `where id='${U.ownerA}'`)) !== 1) throw new Error('sahip silinmiş')
})

await as(U.solo)
await step('tek kullanıcılı sahip silince işletme ve tüm veri gider', () => db.query('select delete_my_account()'))
await sup()
await step('tek kullanıcılı işletmeden iz kalmadı', async () => {
  for (const t of ['reservations', 'customers', 'payments', 'expenses', 'leads', 'venues', 'subscriptions', 'profiles']) {
    const where = t === 'profiles' ? `where id='${U.solo}'` : `where business_id='${biz}'`
    const c = await count(t, where)
    if (c !== 0) throw new Error(`${t}: ${c} satır kalmış`)
  }
  if ((await count('businesses', `where id='${biz}'`)) !== 0) throw new Error('işletme kalmış')
  if ((await count('auth.users', `where id='${U.solo}'`)) !== 0) throw new Error('auth kaydı kalmış')
})
await step('başka işletmenin verisine dokunulmadı', async () => {
  const bizB = (await db.query(`select business_id from profiles where id=$1`, [U.ownerB])).rows[0]?.business_id
  if (!bizB) throw new Error('B işletmesi silinmiş')
  if ((await count('expense_categories', `where business_id='${bizB}'`)) === 0) throw new Error('B kategorileri silinmiş')
})

console.log(`\n${pass} geçti, ${fail} kaldı`)
process.exit(fail ? 1 : 0)
