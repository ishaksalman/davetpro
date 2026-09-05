-- =============================================================================
-- DavetPro · 0016 · Görüşme geçmişi düzeltmeleri + "mekana geldi" kaynağı
--
-- 1) Geçmişteki teklif tutarı yanlıştı. quotes_activity trigger'ı
--    "after insert on quotes" çalışıyor, save_quote ise quote_items'ı teklif
--    satırından SONRA ekliyor. total_amount üretilmiş bir kolon
--    (package + extras - discount) olduğu için trigger anında extras hâlâ 0:
--    geçmişte ₺372.500, teklifte ₺382.500 görünüyordu.
--
-- 2) Para biçimi İngilizceydi. to_char'daki G/D yerele bağlı ve varsayılan
--    'C' yerelinde "382,500." üretiyordu. Uygulamanın geri kalanı ₺382.500.
--
-- 3) lead_source içinde salona gelen müşteri için değer yoktu; kullanıcı
--    "Diğer" seçmek zorundaydı. Kanal raporunda ayrı satır olması gerekiyor.
-- =============================================================================

-- --- Türkçe para biçimi ------------------------------------------------------
-- to_char'da ',' ve '.' yerelden bağımsız birer sabit; yerele bağlı olan
-- G ve D. Önce ABD biçiminde üretilip ayırıcılar yer değiştiriyor.
-- Kuruş yalnızca sıfırdan farklıysa yazılıyor — istemcideki formatMoney ile aynı.
create or replace function public.format_money(p_amount numeric)
returns text
language sql
immutable
as $fn$
  select '₺' || translate(
    to_char(
      round(coalesce(p_amount, 0), 2),
      case
        when round(coalesce(p_amount, 0), 2) = trunc(round(coalesce(p_amount, 0), 2))
          then 'FM999,999,999,999'
        else 'FM999,999,999,999.00'
      end
    ),
    ',.', '.,'
  );
$fn$;

grant execute on function public.format_money(numeric) to authenticated;

-- --- Teklif geçmişi ----------------------------------------------------------

-- Oluşturma kaydı artık ayrı ve ertelenmiş bir trigger'da: işlem sonunda
-- çalıştığı için quote_items eklenmiş ve total_amount güncel oluyor.
create or replace function public.quotes_created_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_row public.quotes;
begin
  -- Satır işlem içinde silinmiş olabilir.
  select * into v_row from public.quotes where id = new.id;
  if not found then
    return null;
  end if;

  perform public.log_lead_activity(
    v_row.lead_id,
    case when v_row.version > 1 then 'Teklif revize edildi' else 'Teklif oluşturuldu' end
    || ' (' || v_row.quote_number || '): '
    || public.format_money(v_row.total_amount));

  return null;
end;
$fn$;

drop trigger if exists quotes_created_activity on public.quotes;
create constraint trigger quotes_created_activity
  after insert on public.quotes
  deferrable initially deferred
  for each row execute function public.quotes_created_activity();

-- Eski trigger yalnızca durum değişikliğini yazıyor; oluşturma yukarı taşındı.
create or replace function public.quotes_activity_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.log_lead_activity(
      new.lead_id,
      new.quote_number || ' · ' || case new.status
        when 'gonderildi'   then 'Teklif gönderildi'
        when 'kabul'        then 'Teklif kabul edildi'
        when 'reddedildi'   then 'Teklif reddedildi'
        when 'suresi_doldu' then 'Teklifin süresi doldu'
        else 'Teklif taslağa alındı'
      end);
  end if;
  return null;
end;
$fn$;

drop trigger if exists quotes_activity on public.quotes;
create trigger quotes_activity after update on public.quotes
  for each row execute function public.quotes_activity_trigger();

-- --- Opsiyon geçmişi: iki tarih yan yana okunmuyordu -------------------------

create or replace function public.venue_holds_activity_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_until text := to_char(
    new.expires_at at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI');
begin
  if tg_op = 'INSERT' then
    perform public.log_lead_activity(
      new.lead_id,
      to_char(new.event_date, 'DD.MM.YYYY') || ' tarihi opsiyona alındı'
      || ' · opsiyon bitişi ' || v_until);
  elsif new.status is distinct from old.status then
    perform public.log_lead_activity(new.lead_id, case new.status
      when 'suresi_doldu'  then 'Opsiyon süresi sona erdi.'
      when 'donusturuldu'  then 'Opsiyon rezervasyona dönüştürüldü.'
      when 'iptal'         then 'Opsiyon iptal edildi.'
      else 'Opsiyon yeniden aktif edildi.' end);
  elsif new.expires_at is distinct from old.expires_at then
    perform public.log_lead_activity(
      new.lead_id, 'Opsiyon uzatıldı · yeni bitiş ' || v_until);
  end if;
  return null;
end;
$fn$;

-- --- Kaynak: mekana geldi ----------------------------------------------------

-- ALTER TYPE ... ADD VALUE, betiğin tamamı tek bir işlem olarak çalıştığında
-- (Supabase SQL Editor böyle çalıştırıyor) reddedilebiliyor ve o satır hata
-- verince BÜTÜN migration geri alınıyor. Tipi yeniden kurmak işlem içinde
-- sorunsuz; 0014'te lead_status için de bu yöntem kullanıldı.
--
-- Koşul içinde: dosya yeniden çalıştırılırsa ikinci kez kurmaya çalışmaz.
do $mig$
begin
  if 'yuz_yuze' = any (enum_range(null::public.lead_source)::text[]) then
    return;
  end if;

  -- Tipe bağlı tek nesne leads.source kolonu ve varsayılanı; index, kısıt
  -- veya kolonu adıyla anan trigger yok.
  alter table public.leads alter column source drop default;
  alter type public.lead_source rename to lead_source_old;

  create type public.lead_source as enum (
    'whatsapp', 'instagram', 'telefon', 'yuz_yuze',
    'web', 'referans', 'google', 'diger'
  );

  alter table public.leads
    alter column source type public.lead_source
    using source::text::public.lead_source;
  alter table public.leads alter column source set default 'telefon';

  drop type public.lead_source_old;
end
$mig$;
