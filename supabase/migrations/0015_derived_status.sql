-- =============================================================================
-- DavetPro · 0015 · Satış hattı durumu tamamen türetiliyor
--
-- 0013 'opsiyonlu' durumunu aktif opsiyona bağlamıştı ama 'teklif_verildi'
-- serbest kalmıştı: teklifi olan talep elle "Yeni talep"e çekilebiliyor,
-- teklifi olmayan talep "Teklif verildi" yapılabiliyordu. İkisi de ekranın
-- yalan söylemesi demek.
--
-- Kural: durum elle ayarlanan bir alan değil, gerçek kayıtların sonucu.
--
--   yeni           → teklifi yok
--   teklif_verildi → en az bir teklifi var
--   opsiyonlu      → süresi dolmamış aktif opsiyonu var
--   kazanildi      → rezervasyona dönüştü
--   kaybedildi     → nedeni belirtilerek kapatıldı
--
-- Hat kendiliğinden ilerliyor: teklif ver, opsiyona al, rezervasyona dönüştür.
-- Bu yüzden arayüzdeki elle taşıma (kanban sürükleme ve durum menüsü) kaldırıldı;
-- burada da veritabanı seviyesinde kapatılıyor.
-- =============================================================================

-- Bir talebin gerçek durumu ne olmalı? Kapanmış durumlar (kazanildi/kaybedildi)
-- ayrı yönetildiği için burada yalnızca açık hat hesaplanıyor.
create or replace function public.derived_lead_status(p_lead_id uuid)
returns public.lead_status
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select case
    when exists (
      select 1 from public.venue_holds
       where lead_id = p_lead_id and status = 'aktif' and expires_at > now()
    ) then 'opsiyonlu'::public.lead_status
    when exists (
      select 1 from public.quotes where lead_id = p_lead_id
    ) then 'teklif_verildi'::public.lead_status
    else 'yeni'::public.lead_status
  end;
$fn$;

grant execute on function public.derived_lead_status(uuid) to authenticated;

-- 0013'teki opsiyon denetiminin yerini alıyor: artık açık hattın tamamını
-- denetliyor, yalnızca 'opsiyonlu' değil.
create or replace function public.lead_hold_status_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_expected public.lead_status;
begin
  if new.status = old.status then
    return new;
  end if;

  -- Kapanış durumları kendi akışlarıyla yönetiliyor (dönüştürme / kaybedildi).
  if new.status in ('kazanildi', 'kaybedildi') then
    return new;
  end if;

  perform public.expire_venue_holds(new.venue_id);
  v_expected := public.derived_lead_status(new.id);

  if new.status = v_expected then
    return new;
  end if;

  if new.status = 'opsiyonlu' then
    raise exception
      'Bu talep için aktif bir opsiyon yok. Önce "Tarihi Opsiyona Al" ile salon, tarih ve opsiyon bitişini belirleyin.'
      using errcode = 'check_violation';
  elsif new.status = 'teklif_verildi' then
    raise exception
      'Bu talep için teklif yok. Durum, teklif oluşturulduğunda kendiliğinden ilerler.'
      using errcode = 'check_violation';
  else
    raise exception
      'Talebin durumu elle değiştirilemez; teklif, opsiyon ve rezervasyon kayıtlarına göre kendiliğinden belirlenir.'
      using errcode = 'check_violation';
  end if;
end;
$fn$;

-- Opsiyon kapanınca talep türetilmiş durumuna dönsün.
create or replace function public.lead_hold_status_sync()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_status public.lead_status;
begin
  if old.status <> 'aktif' or new.status = 'aktif' or new.status = 'donusturuldu' then
    return new;
  end if;

  -- Kapanmış talebe dokunma.
  if not exists (
    select 1 from public.leads
     where id = new.lead_id and status not in ('kazanildi', 'kaybedildi')
  ) then
    return new;
  end if;

  v_status := public.derived_lead_status(new.lead_id);
  update public.leads set status = v_status
   where id = new.lead_id and status <> v_status;

  return new;
end;
$fn$;

-- Teklif oluşturulunca talep ilerlesin; artık koşul türetilmiş durumdan geliyor.
create or replace function public.quote_lead_status_sync()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  update public.leads
     set status = public.derived_lead_status(new.lead_id),
         last_contact_at = now()
   where id = new.lead_id
     and status not in ('kazanildi', 'kaybedildi', 'opsiyonlu');
  return new;
end;
$fn$;

drop trigger if exists quotes_lead_status_sync on public.quotes;
create trigger quotes_lead_status_sync
  after insert on public.quotes
  for each row execute function public.quote_lead_status_sync();
