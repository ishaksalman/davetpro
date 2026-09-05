-- =============================================================================
-- DavetPro · 0004 · View'lar, RPC'ler, izinler
-- Tüm view'lar security_invoker: RLS çağıran kullanıcı için uygulanır.
-- =============================================================================

-- --- Rezervasyon finansal özeti ----------------------------------------------
-- "Kârlılık" (satış - gider) ile "nakit akışı" (tahsilat) ayrı kolonlarda.

create view public.reservation_financials with (security_invoker = true) as
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
  end                                   as profit_margin
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

-- --- Müşteri bakiye özeti -----------------------------------------------------

create view public.customer_balances with (security_invoker = true) as
select
  c.id                             as customer_id,
  c.business_id,
  count(rf.reservation_id) filter (where rf.status <> 'iptal_edildi') as reservation_count,
  coalesce(sum(rf.net_amount) filter (where rf.status <> 'iptal_edildi'), 0)       as total_sales,
  coalesce(sum(rf.collected_amount) filter (where rf.status <> 'iptal_edildi'), 0) as total_paid,
  coalesce(sum(rf.balance_amount) filter (where rf.status <> 'iptal_edildi'), 0)   as total_balance,
  max(rf.event_date)               as last_event_date
from public.customers c
left join public.reservation_financials rf on rf.customer_id = c.id
group by c.id, c.business_id;

-- =============================================================================
-- RPC · İşletme kurulumu
-- =============================================================================

create or replace function public.create_business_with_owner(
  p_business_name text,
  p_full_name     text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_uid         uuid := auth.uid();
  v_business_id uuid;
  v_category    text;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Bu kullanıcı zaten bir işletmeye bağlı.' using errcode = 'unique_violation';
  end if;

  insert into public.businesses (name)
  values (btrim(p_business_name))
  returning id into v_business_id;

  insert into public.profiles (id, business_id, full_name, role, can_view_finance)
  values (v_uid, v_business_id, btrim(p_full_name), 'owner', true);

  foreach v_category in array array[
    'Personel', 'Catering / Yemek', 'İçecek', 'Dekorasyon', 'Müzik / DJ',
    'Fotoğraf / Video', 'Temizlik', 'Elektrik / Doğalgaz', 'Kira',
    'Bakım / Onarım', 'Reklam', 'Vergi', 'Diğer'
  ] loop
    insert into public.expense_categories (business_id, name)
    values (v_business_id, v_category);
  end loop;

  return v_business_id;
end;
$fn$;

-- =============================================================================
-- RPC · Rezervasyon kaydı (operasyon + fiyat tek transaction'da)
-- security invoker: RLS ve finans yetkisi çağıran kullanıcıya göre uygulanır.
-- =============================================================================

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
  p_due_date          date
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
    insert into public.reservation_pricing (reservation_id, gross_amount, discount_amount, due_date)
    values (v_id, p_gross_amount, coalesce(p_discount_amount, 0), p_due_date)
    on conflict (reservation_id) do update set
      gross_amount    = excluded.gross_amount,
      discount_amount = excluded.discount_amount,
      due_date        = excluded.due_date;
  end if;

  return v_id;
end;
$fn$;

-- =============================================================================
-- RPC · Raporlama toplulaştırmaları
-- =============================================================================

-- Dönem finans özeti. Satış/kâr organizasyon tarihine, nakit akışı işlem
-- tarihine göre hesaplanır — iki kavram bilinçli olarak ayrıdır.
create or replace function public.finance_summary(p_from date, p_to date)
returns table (
  total_sales        numeric,
  collected_in_range numeric,
  outstanding        numeric,
  total_expenses     numeric,
  net_cash           numeric,
  profit             numeric,
  profit_margin      numeric,
  reservation_count  bigint,
  avg_sale           numeric
)
language sql
stable
set search_path = public, pg_temp
as $fn$
  with r as (
    select *
    from public.reservation_financials
    where event_date between p_from and p_to
      and status <> 'iptal_edildi'
  ),
  cash as (
    select coalesce(sum(amount), 0) as collected
    from public.payments
    where voided_at is null and payment_date between p_from and p_to
  ),
  spend as (
    select coalesce(sum(amount), 0) as spent
    from public.expenses
    where voided_at is null and expense_date between p_from and p_to
  )
  select
    coalesce(sum(r.net_amount), 0),
    cash.collected,
    coalesce(sum(r.balance_amount), 0),
    spend.spent,
    cash.collected - spend.spent,
    coalesce(sum(r.net_amount), 0) - spend.spent,
    case when coalesce(sum(r.net_amount), 0) > 0
      then round((coalesce(sum(r.net_amount), 0) - spend.spent) * 100 / sum(r.net_amount), 2)
    end,
    count(r.reservation_id),
    case when count(r.reservation_id) > 0
      then round(coalesce(sum(r.net_amount), 0) / count(r.reservation_id), 2)
    end
  from cash, spend
  left join r on true
  group by cash.collected, spend.spent;
$fn$;

-- Aylık gelir-gider serisi (grafik için).
create or replace function public.monthly_series(p_from date, p_to date)
returns table (
  month     date,
  sales     numeric,
  collected numeric,
  expenses  numeric
)
language sql
stable
set search_path = public, pg_temp
as $fn$
  with months as (
    select generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month')::date as m
  )
  select
    months.m,
    coalesce((
      select sum(rf.net_amount) from public.reservation_financials rf
      where rf.status <> 'iptal_edildi'
        and date_trunc('month', rf.event_date)::date = months.m
    ), 0),
    coalesce((
      select sum(p.amount) from public.payments p
      where p.voided_at is null
        and date_trunc('month', p.payment_date)::date = months.m
    ), 0),
    coalesce((
      select sum(e.amount) from public.expenses e
      where e.voided_at is null
        and date_trunc('month', e.expense_date)::date = months.m
    ), 0)
  from months
  order by months.m;
$fn$;

-- Salon bazlı performans karşılaştırması.
create or replace function public.venue_performance(p_from date, p_to date)
returns table (
  venue_id          uuid,
  venue_name        text,
  reservation_count bigint,
  sales             numeric,
  expenses          numeric,
  profit            numeric
)
language sql
stable
set search_path = public, pg_temp
as $fn$
  select
    v.id,
    v.name,
    count(rf.reservation_id),
    coalesce(sum(rf.net_amount), 0),
    coalesce(sum(rf.expense_amount), 0),
    coalesce(sum(rf.profit_amount), 0)
  from public.venues v
  left join public.reservation_financials rf
    on rf.venue_id = v.id
   and rf.status <> 'iptal_edildi'
   and rf.event_date between p_from and p_to
  group by v.id, v.name
  order by 4 desc;
$fn$;

-- Organizasyon türü kırılımı.
create or replace function public.type_breakdown(p_from date, p_to date)
returns table (
  organization_type public.organization_type,
  reservation_count bigint,
  sales             numeric
)
language sql
stable
set search_path = public, pg_temp
as $fn$
  select rf.organization_type, count(*), coalesce(sum(rf.net_amount), 0)
  from public.reservation_financials rf
  where rf.status <> 'iptal_edildi'
    and rf.event_date between p_from and p_to
  group by rf.organization_type
  order by 2 desc;
$fn$;

-- Paket kırılımı.
create or replace function public.package_breakdown(p_from date, p_to date)
returns table (
  package_id        uuid,
  package_name      text,
  reservation_count bigint,
  sales             numeric
)
language sql
stable
set search_path = public, pg_temp
as $fn$
  select pk.id, pk.name, count(*), coalesce(sum(rf.net_amount), 0)
  from public.reservation_financials rf
  join public.packages pk on pk.id = rf.package_id
  where rf.status <> 'iptal_edildi'
    and rf.event_date between p_from and p_to
  group by pk.id, pk.name
  order by 3 desc;
$fn$;

-- En yoğun günler (0 = Pazar).
create or replace function public.weekday_breakdown(p_from date, p_to date)
returns table (weekday integer, reservation_count bigint)
language sql
stable
set search_path = public, pg_temp
as $fn$
  select extract(dow from rf.event_date)::integer, count(*)
  from public.reservation_financials rf
  where rf.status <> 'iptal_edildi'
    and rf.event_date between p_from and p_to
  group by 1
  order by 1;
$fn$;

-- =============================================================================
-- İzinler
-- =============================================================================

grant usage on schema public to authenticated;

revoke all on all tables in schema public from anon, public;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Finansal kayıtlar silinemez. RLS'te DELETE policy'si olmaması silmeyi zaten
-- engellerdi, ama sessizce "0 satır" dönerdi. Yetkiyi tamamen geri alarak
-- yanlış bir silme denemesinin açık bir hata vermesini sağlıyoruz.
revoke delete on public.payments, public.expenses from authenticated;
revoke delete on public.businesses, public.profiles from authenticated;

revoke all on all functions in schema public from anon, public;
grant execute on function
  public.create_business_with_owner(text, text),
  public.save_reservation(uuid, uuid, uuid, uuid, public.organization_type,
                          public.reservation_status, date, time, time, integer,
                          text, numeric, numeric, date),
  public.finance_summary(date, date),
  public.monthly_series(date, date),
  public.venue_performance(date, date),
  public.type_breakdown(date, date),
  public.package_breakdown(date, date),
  public.weekday_breakdown(date, date)
to authenticated;
