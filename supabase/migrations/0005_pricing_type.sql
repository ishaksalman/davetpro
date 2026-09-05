-- =============================================================================
-- DavetPro · 0005 · Kişi başı fiyatlandırma
--
-- Salonların bir kısmı salonu sabit fiyata verir, bir kısmı kişi başı menü
-- fiyatı üzerinden çalışır. İkisi de destekleniyor.
--
-- ÖNEMLİ: Rezervasyonda muhasebesel gerçek yine tek bir tutardır
-- (reservation_pricing.gross_amount). unit_price bilgi amaçlıdır: formun
-- "kişi başı × kişi sayısı" hesabını yapabilmesi ve detay ekranında dökümün
-- gösterilebilmesi için saklanır. Böylece tahsilat/kâr hesapları değişmez.
-- =============================================================================

create type public.pricing_type as enum ('sabit', 'kisi_basi');

alter table public.packages
  add column pricing_type public.pricing_type not null default 'sabit';

comment on column public.packages.base_price is
  'pricing_type = sabit ise toplam paket fiyatı, kisi_basi ise kişi başı fiyat.';

alter table public.reservation_pricing
  add column unit_price numeric(12, 2)
    check (unit_price is null or unit_price >= 0);

comment on column public.reservation_pricing.unit_price is
  'Kişi başı anlaşıldıysa birim fiyat. Toplam yine gross_amount kolonundadır.';

-- View'a unit_price eklenir (yeni kolon sona gelir; mevcut sıra korunur).
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

-- save_reservation'a birim fiyat parametresi eklenir.
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

-- Eski 14 parametreli imza kaldırılır ki PostgREST hangi fonksiyonu çağıracağını
-- şaşırmasın (aşırı yükleme belirsizliği).
drop function if exists public.save_reservation(
  uuid, uuid, uuid, uuid, public.organization_type, public.reservation_status,
  date, time, time, integer, text, numeric, numeric, date
);

grant execute on function public.save_reservation(
  uuid, uuid, uuid, uuid, public.organization_type, public.reservation_status,
  date, time, time, integer, text, numeric, numeric, date, numeric
) to authenticated;
