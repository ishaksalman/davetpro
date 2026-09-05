-- =============================================================================
-- DavetPro · 0020 · reservation_status enum'u temizleniyor
--
-- 0019 satırları taşıdı ve varsayılanı düzeltti ama enum değerlerini bıraktı:
-- "tipi yeniden kurmak finansal çekirdeği düşürmeyi gerektirir, kazanç riske
-- değmez" denmişti. Değmiyor da değildi — ölü değerler sistemin hâlâ
-- "rezervasyonun ön görüşme hâli olur" demesine yol açıyor ve Talepler modülü
-- varken bu yanlış mesaj. Şimdi temizleniyor.
--
-- Tipe bağlı dört nesne, tip yeniden kurulmadan önce düşürülüp sonunda birebir
-- geri kuruluyor:
--   · reservation_financials, customer_balances  (status kolonunu seçiyorlar)
--   · save_reservation                           (imzasında reservation_status)
--   · reservations_hold_guard                    (tanımında "update of status")
--   · reservations_no_overlap                    (WHERE koşulu tipe bağlı)
--
-- Görünüm ve fonksiyon gövdeleri 0005/0006'daki hâllerinden birebir alındı;
-- bu migration davranış değiştirmiyor, yalnızca tipi daraltıyor.
-- =============================================================================

drop view if exists public.customer_balances;
drop view if exists public.reservation_financials;

drop function if exists public.save_reservation(
  uuid, uuid, uuid, uuid, public.organization_type, public.reservation_status,
  date, time, time, integer, text, numeric, numeric, date, numeric
);

drop trigger if exists reservations_hold_guard on public.reservations;

alter table public.reservations
  drop constraint if exists reservations_no_overlap;

-- 0019 bunu zaten yaptı; yeniden çalıştırmaya karşı güvenlik ağı.
update public.reservations
   set status = 'kesinlesti'
 where status::text in ('on_gorusme', 'opsiyonlu');

alter table public.reservations alter column status drop default;
alter type public.reservation_status rename to reservation_status_old;

create type public.reservation_status as enum (
  'kesinlesti',    -- Kesinleşmiş rezervasyon
  'tamamlandi',    -- Organizasyon gerçekleşti
  'iptal_edildi'   -- İptal edildi
);

alter table public.reservations
  alter column status type public.reservation_status
  using status::text::public.reservation_status;
alter table public.reservations alter column status set default 'kesinlesti';

drop type public.reservation_status_old;

comment on column public.reservations.status is
  'kesinlesti | tamamlandi | iptal_edildi. Satış öncesi aşamalar Talepler '
  'modülünde (leads + venue_holds).';

-- --- Düşürülen nesneler birebir geri -----------------------------------------

alter table public.reservations
  add constraint reservations_no_overlap exclude using gist (
    venue_id with =,
    tsrange(
      (event_date + start_time),
      (event_date + end_time)
        + (case when end_time <= start_time then interval '1 day' else interval '0 day' end),
      '[)'
    ) with &&
  ) where (status <> 'iptal_edildi');

create trigger reservations_hold_guard
  before insert or update of venue_id, event_date, start_time, end_time, status
  on public.reservations
  for each row execute function public.reservation_hold_guard();

create or replace view public.reservation_financials with (security_invoker = true) as
select
  r.id                                  as reservation_id,
  r.business_id,
  r.venue_id,
  r.customer_id,
  r.package_id,
  r.event_date,
  r.status,
  r.organization_type,
  coalesce(p.gross_amount, 0)           as gross_amount,
  coalesce(p.discount_amount, 0)        as discount_amount,
  coalesce(p.net_amount, 0)             as net_amount,
  p.due_date,
  coalesce(pay.collected, 0)            as collected_amount,
  coalesce(p.net_amount, 0) - coalesce(pay.collected, 0) as balance_amount,
  coalesce(exp.total, 0)                as expense_amount,
  coalesce(p.net_amount, 0) - coalesce(exp.total, 0)     as profit_amount,
  case
    when coalesce(p.net_amount, 0) > 0
    then round((coalesce(p.net_amount, 0) - coalesce(exp.total, 0)) * 100 / p.net_amount, 2)
  end                                   as profit_margin,
  p.unit_price
from public.reservations r
left join public.reservation_pricing p on p.reservation_id = r.id
left join lateral (
  select sum(amount) as collected
  from public.payments
  where reservation_id = r.id and voided_at is null
) pay on true
left join lateral (
  select sum(amount) as total
  from public.expenses
  where reservation_id = r.id and voided_at is null
) exp on true;

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

create or replace function public.save_reservation(
  p_id                uuid,
  p_customer_id       uuid,
  p_venue_id          uuid,
  p_package_id        uuid,
  p_organization_type public.organization_type,
  p_status            public.reservation_status,
  p_event_date        date,
  p_start_time        time,
  p_end_time          time,
  p_guest_count       integer,
  p_notes             text,
  p_gross_amount      numeric,
  p_discount_amount   numeric,
  p_due_date          date,
  p_unit_price        numeric default null
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into public.reservations (
      customer_id, venue_id, package_id, organization_type, status,
      event_date, start_time, end_time, guest_count, notes
    ) values (
      p_customer_id, p_venue_id, p_package_id, p_organization_type, p_status,
      p_event_date, p_start_time, p_end_time, p_guest_count, nullif(btrim(p_notes), '')
    )
    returning id into v_id;
  else
    update public.reservations set
      customer_id       = p_customer_id,
      venue_id          = p_venue_id,
      package_id        = p_package_id,
      organization_type = p_organization_type,
      status            = p_status,
      event_date        = p_event_date,
      start_time        = p_start_time,
      end_time          = p_end_time,
      guest_count       = p_guest_count,
      notes             = nullif(btrim(p_notes), '')
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Rezervasyon bulunamadı.' using errcode = 'no_data_found';
    end if;
  end if;

  -- Finans yetkisi olmayan personel fiyat yazamaz; rezervasyon yine oluşur.
  if public.can_see_finance() and p_gross_amount is not null then
    insert into public.reservation_pricing
      (reservation_id, gross_amount, discount_amount, due_date, unit_price)
    values
      (v_id, p_gross_amount, coalesce(p_discount_amount, 0), p_due_date, p_unit_price)
    on conflict (reservation_id) do update set
      gross_amount    = excluded.gross_amount,
      discount_amount = excluded.discount_amount,
      due_date        = excluded.due_date,
      unit_price      = excluded.unit_price;
  end if;

  return v_id;
end;
$fn$;

grant execute on function public.save_reservation(
  uuid, uuid, uuid, uuid, public.organization_type, public.reservation_status,
  date, time, time, integer, text, numeric, numeric, date, numeric
) to authenticated;

-- Görünümler DROP edildiği için 0004'teki toplu grant'ı kaybettiler.
-- ("create or replace view" yetkileri korurdu ama tip değişimi drop gerektirdi.)
grant select on public.reservation_financials to authenticated;
grant select on public.customer_balances to authenticated;
