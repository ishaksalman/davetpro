-- =============================================================================
-- DavetPro · 0013 · "Opsiyonlu" durumu opsiyonun kendisine bağlanıyor
--
-- İki yönlü tutarsızlık vardı:
--
--   1. Talep panoda "Opsiyonlu" sütununa sürüklenince durum değişiyor ama
--      venue_holds'a kayıt açılmıyordu. Salon aslında bloke değil; takvimde
--      görünmüyor, müsaitlik hesabına girmiyor. Ekran yalan söylüyordu.
--
--   2. Opsiyonun süresi dolunca (expire_venue_holds) yalnızca opsiyon
--      kapanıyor, talep "Opsiyonlu" kalmaya devam ediyordu.
--
-- Kural: 'opsiyonlu' bir durum değil, bir sonuç. Aktif opsiyon varsa talep
-- opsiyonludur; yoksa değildir. Her iki yön de trigger'la zorlanıyor.
-- =============================================================================

-- --- Elle 'opsiyonlu' yapılamaz ---------------------------------------------

create or replace function public.lead_hold_status_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.status <> 'opsiyonlu' or old.status = 'opsiyonlu' then
    return new;
  end if;

  perform public.expire_venue_holds(new.venue_id);

  if not exists (
    select 1 from public.venue_holds
     where lead_id = new.id and status = 'aktif' and expires_at > now()
  ) then
    raise exception
      'Bu talep için aktif bir opsiyon yok. Önce "Tarihi Opsiyona Al" ile salon, tarih ve opsiyon bitişini belirleyin.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$fn$;

drop trigger if exists leads_hold_status_guard on public.leads;
create trigger leads_hold_status_guard
  before update of status on public.leads
  for each row execute function public.lead_hold_status_guard();

-- --- Opsiyon kapanınca talep geri düşer --------------------------------------

create or replace function public.lead_hold_status_sync()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_lead record;
begin
  -- Yalnızca aktiflikten çıkışta ilgileniyoruz. 'donusturuldu' hariç: o akış
  -- talebi zaten 'kazanildi' yapıyor, üzerine yazmayalım.
  if old.status <> 'aktif' or new.status = 'aktif' or new.status = 'donusturuldu' then
    return new;
  end if;

  select id, status into v_lead from public.leads where id = new.lead_id;
  if not found or v_lead.status <> 'opsiyonlu' then
    return new;
  end if;

  -- Başka bir aktif opsiyon varsa talep opsiyonlu kalmalı.
  if exists (
    select 1 from public.venue_holds
     where lead_id = new.lead_id and id <> new.id
       and status = 'aktif' and expires_at > now()
  ) then
    return new;
  end if;

  -- Hattın bir önceki adımına dön: teklif verilmişse oraya, yoksa görüşmeye.
  update public.leads
     set status = case
       when exists (select 1 from public.quotes where lead_id = new.lead_id)
         then 'teklif_verildi'::public.lead_status
       else 'gorusuluyor'::public.lead_status
     end
   where id = new.lead_id;

  return new;
end;
$fn$;

drop trigger if exists venue_holds_status_sync on public.venue_holds;
create trigger venue_holds_status_sync
  after update of status on public.venue_holds
  for each row execute function public.lead_hold_status_sync();
