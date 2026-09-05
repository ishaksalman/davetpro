-- =============================================================================
-- DavetPro · 0003 · Row Level Security
-- Tenant izolasyonu tamamen bu katmanda; frontend filtresine güvenilmez.
-- =============================================================================

alter table public.businesses          enable row level security;
alter table public.profiles            enable row level security;
alter table public.venues              enable row level security;
alter table public.packages            enable row level security;
alter table public.customers           enable row level security;
alter table public.reservations        enable row level security;
alter table public.reservation_pricing enable row level security;
alter table public.payments            enable row level security;
alter table public.expense_categories  enable row level security;
alter table public.expenses            enable row level security;

-- Servis rolü dışındaki hiçbir yol RLS'i atlayamaz.
alter table public.businesses          force row level security;
alter table public.profiles            force row level security;
alter table public.venues              force row level security;
alter table public.packages            force row level security;
alter table public.customers           force row level security;
alter table public.reservations        force row level security;
alter table public.reservation_pricing force row level security;
alter table public.payments            force row level security;
alter table public.expense_categories  force row level security;
alter table public.expenses            force row level security;

-- --- businesses --------------------------------------------------------------
-- INSERT yok: işletme yalnızca create_business_with_owner() ile açılır.
-- DELETE yok: işletme silme MVP kapsamı dışında.

create policy businesses_select on public.businesses
  for select to authenticated
  using (id = public.current_business_id());

create policy businesses_update on public.businesses
  for update to authenticated
  using (id = public.current_business_id() and public.is_business_admin())
  with check (id = public.current_business_id() and public.is_business_admin());

-- --- profiles ----------------------------------------------------------------
-- INSERT yok: profil ancak kayıt/davet RPC'leri ile oluşur.

create policy profiles_select on public.profiles
  for select to authenticated
  using (business_id = public.current_business_id());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (business_id = public.current_business_id() and public.is_business_admin())
  with check (business_id = public.current_business_id() and public.is_business_admin());

-- Yetki yükseltmeyi RLS değil, trigger engeller (kolon bazlı kural).
create or replace function public.enforce_profile_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.business_id is distinct from old.business_id then
    raise exception 'Kullanıcının bağlı olduğu işletme değiştirilemez.'
      using errcode = 'check_violation';
  end if;

  if (new.role is distinct from old.role
      or new.can_view_finance is distinct from old.can_view_finance
      or new.is_active is distinct from old.is_active)
  then
    if not public.is_business_admin() then
      raise exception 'Rol ve yetki değişikliği için yönetici olmanız gerekir.'
        using errcode = 'insufficient_privilege';
    end if;
    if old.id = auth.uid() then
      raise exception 'Kendi rolünüzü veya yetkinizi değiştiremezsiniz.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.enforce_profile_guard();

-- --- Operasyonel tablolar (tüm roller erişir) --------------------------------

do $$
declare t text;
begin
  foreach t in array array['venues', 'packages', 'customers', 'expense_categories'] loop
    execute format($p$
      create policy %1$I_select on public.%2$I for select to authenticated
        using (business_id = public.current_business_id());
      create policy %1$I_insert on public.%2$I for insert to authenticated
        with check (business_id = public.current_business_id());
      create policy %1$I_update on public.%2$I for update to authenticated
        using (business_id = public.current_business_id())
        with check (business_id = public.current_business_id());
      create policy %1$I_delete on public.%2$I for delete to authenticated
        using (business_id = public.current_business_id());
    $p$, t, t);
  end loop;
end;
$$;

-- --- reservations ------------------------------------------------------------

create policy reservations_select on public.reservations
  for select to authenticated
  using (business_id = public.current_business_id());

create policy reservations_insert on public.reservations
  for insert to authenticated
  with check (business_id = public.current_business_id());

create policy reservations_update on public.reservations
  for update to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- Rezervasyon silme yalnızca yöneticide; ayrıca ödeme/gider bağlıysa
-- FK RESTRICT zaten engeller.
create policy reservations_delete on public.reservations
  for delete to authenticated
  using (business_id = public.current_business_id() and public.is_business_admin());

-- --- Finansal tablolar (can_see_finance() kapısı) ----------------------------

create policy pricing_select on public.reservation_pricing
  for select to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance());

create policy pricing_insert on public.reservation_pricing
  for insert to authenticated
  with check (business_id = public.current_business_id() and public.can_see_finance());

create policy pricing_update on public.reservation_pricing
  for update to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance())
  with check (business_id = public.current_business_id() and public.can_see_finance());

-- payments / expenses: DELETE policy'si bilinçli olarak YOK.
-- Kayıt silinmez, yalnızca iptal edilir (voided_at). Denetim izi korunur.

create policy payments_select on public.payments
  for select to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance());

create policy payments_insert on public.payments
  for insert to authenticated
  with check (business_id = public.current_business_id() and public.can_see_finance());

create policy payments_update on public.payments
  for update to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance())
  with check (business_id = public.current_business_id() and public.can_see_finance());

create policy expenses_select on public.expenses
  for select to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance());

create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (business_id = public.current_business_id() and public.can_see_finance());

create policy expenses_update on public.expenses
  for update to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance())
  with check (business_id = public.current_business_id() and public.can_see_finance());
