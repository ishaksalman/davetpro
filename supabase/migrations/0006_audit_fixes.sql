-- =============================================================================
-- DavetPro · 0006 · Denetim düzeltmeleri
--
-- H1: Fiyat satırı olmayan rezervasyona sınırsız tahsilat yazılabiliyordu.
--     Kural "tahsilat net satışı aşamaz" idi; net yoksa karşılaştıracak bir şey
--     olmadığı için koruma devre dışı kalıyordu ve bakiye negatife düşüyordu.
--     Çözüm: her rezervasyonun MUTLAKA bir fiyat satırı olsun (başlangıçta 0).
--     Böylece özel durum ortadan kalkıyor, mevcut kural her zaman geçerli.
--
-- M2: Rezervasyona bağlı olmayan manuel tahsilat müşteri bakiyesine
--     yansımıyordu; müşteri kartında "yapılan ödemeler" eksik görünüyordu.
-- =============================================================================

-- --- H1: her rezervasyon için fiyat satırı ----------------------------------

create or replace function public.ensure_reservation_pricing()
returns trigger
language plpgsql
-- security definer: finans yetkisi olmayan personel rezervasyon açtığında da
-- satır oluşabilmeli (RLS bu tabloya yazmasını engelliyor).
security definer
set search_path = public, pg_temp
as $fn$
begin
  insert into public.reservation_pricing (reservation_id, business_id)
  values (new.id, new.business_id)
  on conflict (reservation_id) do nothing;
  return new;
end;
$fn$;

create trigger reservations_ensure_pricing
  after insert on public.reservations
  for each row execute function public.ensure_reservation_pricing();

-- Mevcut kayıtlar için geri doldurma
insert into public.reservation_pricing (reservation_id, business_id)
select r.id, r.business_id
from public.reservations r
left join public.reservation_pricing p on p.reservation_id = r.id
where p.reservation_id is null;

-- Satış tutarı girilmemiş organizasyonlarda mesaj daha yol gösterici olsun.
create or replace function public.enforce_payment_not_exceeding_net()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_net       numeric(12, 2);
  v_collected numeric(12, 2);
begin
  if new.reservation_id is null or new.voided_at is not null then
    return new;
  end if;

  select net_amount into v_net
  from public.reservation_pricing
  where reservation_id = new.reservation_id;

  -- 0006'dan sonra her rezervasyonun fiyat satırı var; yine de savunmacı davran.
  if v_net is null then
    raise exception 'Bu organizasyonun satış tutarı girilmemiş. Önce rezervasyonu düzenleyip fiyatı girin.'
      using errcode = 'check_violation';
  end if;

  if v_net = 0 then
    raise exception 'Bu organizasyonun satış tutarı ₺0 görünüyor. Tahsilat girmeden önce rezervasyonun fiyatını girin.'
      using errcode = 'check_violation';
  end if;

  select coalesce(sum(amount), 0) into v_collected
  from public.payments
  where reservation_id = new.reservation_id
    and voided_at is null
    and id <> new.id;

  if v_collected + new.amount > v_net then
    raise exception
      'Tahsilat toplamı (₺%) rezervasyonun net satış tutarını (₺%) aşamaz.',
      to_char(v_collected + new.amount, 'FM999G999G990D00'),
      to_char(v_net, 'FM999G999G990D00')
      using errcode = 'check_violation';
  end if;

  return new;
end;
$fn$;

-- --- M2: manuel gelir müşteri bakiyesine dahil ------------------------------

create or replace view public.customer_balances with (security_invoker = true) as
select
  c.id          as customer_id,
  c.business_id,
  count(rf.reservation_id) filter (where rf.status <> 'iptal_edildi') as reservation_count,
  coalesce(sum(rf.net_amount) filter (where rf.status <> 'iptal_edildi'), 0) as total_sales,
  -- Rezervasyonlardan tahsil edilen + rezervasyona bağlanmamış manuel gelir
  coalesce(sum(rf.collected_amount) filter (where rf.status <> 'iptal_edildi'), 0)
    + coalesce(mp.manual_paid, 0) as total_paid,
  -- Kalan borç artık "satış − tahsil edilen toplam"; manuel ödeme de borcu düşürür
  coalesce(sum(rf.net_amount) filter (where rf.status <> 'iptal_edildi'), 0)
    - coalesce(sum(rf.collected_amount) filter (where rf.status <> 'iptal_edildi'), 0)
    - coalesce(mp.manual_paid, 0) as total_balance,
  max(rf.event_date) as last_event_date
from public.customers c
left join public.reservation_financials rf on rf.customer_id = c.id
left join lateral (
  select sum(amount) as manual_paid
  from public.payments
  where customer_id = c.id
    and reservation_id is null
    and voided_at is null
) mp on true
group by c.id, c.business_id, mp.manual_paid;
