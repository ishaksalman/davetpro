-- =============================================================================
-- DavetPro · 0002 · Yardımcı fonksiyonlar, trigger'lar, kolon varsayılanları
-- =============================================================================

-- --- Tenant bağlamı ----------------------------------------------------------
-- security definer: profiles üzerindeki RLS'i atlar, böylece policy'ler
-- kendi kendini çağıran (recursive) hale gelmez.

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select business_id from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

-- Finans verilerini görme yetkisi: owner/manager her zaman, staff yalnızca
-- kendisine bu yetki verilmişse.
create or replace function public.can_see_finance()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role in ('owner', 'manager') or can_view_finance
     from public.profiles where id = auth.uid() and is_active),
    false
  )
$$;

-- Kullanıcı ve rol yönetimi yalnızca owner/manager'a açık.
create or replace function public.is_business_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role in ('owner', 'manager')
     from public.profiles where id = auth.uid() and is_active),
    false
  )
$$;

revoke execute on function public.current_business_id() from public;
revoke execute on function public.current_user_role() from public;
revoke execute on function public.can_see_finance() from public;
revoke execute on function public.is_business_admin() from public;
grant execute on function public.current_business_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.can_see_finance() to authenticated;
grant execute on function public.is_business_admin() to authenticated;

-- --- business_id varsayılanları ----------------------------------------------
-- İstemcinin business_id göndermesine gerek kalmaz; RLS WITH CHECK ile birlikte
-- yanlış tenant'a yazma ihtimalini ortadan kaldırır.

alter table public.venues             alter column business_id set default public.current_business_id();
alter table public.packages           alter column business_id set default public.current_business_id();
alter table public.customers          alter column business_id set default public.current_business_id();
alter table public.reservations       alter column business_id set default public.current_business_id();
alter table public.reservation_pricing alter column business_id set default public.current_business_id();
alter table public.payments           alter column business_id set default public.current_business_id();
alter table public.expense_categories alter column business_id set default public.current_business_id();
alter table public.expenses           alter column business_id set default public.current_business_id();

-- --- updated_at ---------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'businesses', 'profiles', 'venues', 'packages', 'customers',
    'reservations', 'reservation_pricing', 'payments',
    'expense_categories', 'expenses'
  ] loop
    execute format(
      'create trigger %I before update on public.%I
       for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

-- --- created_by otomatik doldurma --------------------------------------------

create or replace function public.set_created_by()
returns trigger
language plpgsql
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger reservations_set_created_by before insert on public.reservations
  for each row execute function public.set_created_by();
create trigger payments_set_created_by before insert on public.payments
  for each row execute function public.set_created_by();
create trigger expenses_set_created_by before insert on public.expenses
  for each row execute function public.set_created_by();

-- --- Finansal kayıt değişmezliği ---------------------------------------------
-- Tutar ve bağlantılar sonradan değiştirilemez. Hata varsa kayıt iptal edilip
-- (void) yenisi açılır; böylece "kalan tutar" ve geçmiş raporlar hiçbir zaman
-- geriye dönük olarak bozulmaz.

create or replace function public.enforce_financial_immutability()
returns trigger
language plpgsql
as $$
begin
  if old.voided_at is not null then
    raise exception 'İptal edilmiş bir finansal kayıt değiştirilemez.'
      using errcode = 'check_violation';
  end if;

  if new.amount is distinct from old.amount
     or new.business_id is distinct from old.business_id
     or new.reservation_id is distinct from old.reservation_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Finansal kaydın tutarı veya bağlantısı değiştirilemez. Kaydı iptal edip yeni kayıt oluşturun.'
      using errcode = 'check_violation';
  end if;

  if new.voided_at is not null and new.voided_by is null then
    new.voided_by := auth.uid();
  end if;

  return new;
end;
$$;

create trigger payments_immutability before update on public.payments
  for each row execute function public.enforce_financial_immutability();
create trigger expenses_immutability before update on public.expenses
  for each row execute function public.enforce_financial_immutability();

-- --- Tahsilat, satış tutarını aşamaz -----------------------------------------
-- Nakit akışı ile muhasebesel satışın karışmaması için tahsilat toplamı
-- rezervasyonun net satış tutarını geçemez.

create or replace function public.enforce_payment_not_exceeding_net()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

  if v_net is null then
    return new;
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
$$;

create trigger payments_not_exceeding_net
  after insert or update on public.payments
  for each row execute function public.enforce_payment_not_exceeding_net();

-- Fiyat düşürüldüğünde de tutarlılık korunsun.
create or replace function public.enforce_net_not_below_collected()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_collected numeric(12, 2);
begin
  select coalesce(sum(amount), 0) into v_collected
  from public.payments
  where reservation_id = new.reservation_id and voided_at is null;

  if new.gross_amount - new.discount_amount < v_collected then
    raise exception
      'Net satış tutarı, tahsil edilmiş tutarın (₺%) altına indirilemez.',
      to_char(v_collected, 'FM999G999G990D00')
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger pricing_net_not_below_collected
  after insert or update on public.reservation_pricing
  for each row execute function public.enforce_net_not_below_collected();
