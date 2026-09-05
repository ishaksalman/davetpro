-- =============================================================================
-- DavetPro · 0010 · Saat girilmemiş taleplerde gün bazlı çakışma
--
-- 0009'daki denetim yalnızca saat aralığı doluyken çalışıyordu. Oysa hızlı
-- talep girişinde en sık kullanılan yol "tarih + salon, saat sonra" — bu
-- durumda dolu bir gün için sessizce talep açılabiliyordu.
--
-- Kural: saat verilmemişse günün tamamı aralık sayılır. Kullanıcı gerçekten
-- farklı bir saat dilimi düşünüyorsa (ör. sabah nişan, akşam düğün) saatleri
-- girerek o aralığın uygunluğunu kontrol edebilir; hata mesajı bunu söylüyor.
-- =============================================================================

-- --- Ortak aralık hesabı ----------------------------------------------------
-- Tek yerde: gece yarısını aşan saatler ve "saat verilmemiş = tüm gün" kuralı.
-- BEFORE trigger'larda üretilmiş kolonlar (starts_at/ends_at) henüz NULL
-- olduğu için aralık her zaman satırın kendi alanlarından hesaplanmalı.

create or replace function public.event_range(
  p_date  date,
  p_start time,
  p_end   time
)
returns tsrange
language sql
immutable
as $fn$
  select case
    when p_start is null or p_end is null
      then tsrange(p_date::timestamp, (p_date + 1)::timestamp, '[)')
    else tsrange(
      p_date + p_start,
      (p_date + p_end)
        + (case when p_end <= p_start then interval '1 day' else interval '0 day' end),
      '[)'
    )
  end;
$fn$;

grant execute on function public.event_range(date, time, time) to authenticated;

-- --- Müsaitlik: saatler artık opsiyonel ------------------------------------

-- Elle çalıştırılan migration'lar sıra dışı veya ikinci kez çalıştırılabiliyor.
-- Her iki olası imza da düşürülüyor: aksi halde var olan bir fonksiyonun
-- üzerine daha az varsayılanla yazmaya çalışmak
-- "cannot remove parameter defaults" hatası veriyor.
drop function if exists public.venue_availability(date, time, time);
drop function if exists public.venue_availability(date, time, time, uuid);

create or replace function public.venue_availability(
  p_event_date     date,
  p_start_time     time default null,
  p_end_time       time default null,
  p_ignore_lead_id uuid default null
)
returns table (
  venue_id       uuid,
  venue_name     text,
  is_available   boolean,
  conflict_kind  text,     -- 'rezervasyon' | 'opsiyon'
  conflict_label text,     -- müşteri adı
  conflict_start time,
  conflict_end   time,
  hold_expires_at timestamptz
)
language plpgsql
stable
set search_path = public, pg_temp
as $fn$
declare
  v_range tsrange := public.event_range(p_event_date, p_start_time, p_end_time);
begin
  return query
  with conflicts as (
    select r.venue_id as vid, 'rezervasyon'::text as kind, c.full_name as label,
           r.start_time as s, r.end_time as e, null::timestamptz as until, 1 as rank
      from public.reservations r
      join public.customers c on c.id = r.customer_id
     where r.event_date between p_event_date - 1 and p_event_date + 1
       and r.status <> 'iptal_edildi'
       and tsrange(r.starts_at, r.ends_at, '[)') && v_range
    union all
    select h.venue_id, 'opsiyon', c.full_name,
           h.start_time, h.end_time, h.expires_at, 2
      from public.venue_holds h
      join public.leads l on l.id = h.lead_id
      join public.customers c on c.id = l.customer_id
     where h.event_date between p_event_date - 1 and p_event_date + 1
       and h.status = 'aktif'
       and h.expires_at > now()
       -- Düzenlenen talebin kendi opsiyonu kendisini engellemesin.
       and (p_ignore_lead_id is null or h.lead_id <> p_ignore_lead_id)
       and tsrange(h.starts_at, h.ends_at, '[)') && v_range
  ),
  -- Bir salonda hem rezervasyon hem opsiyon varsa rezervasyon gösterilir.
  ranked as (
    select distinct on (vid) * from conflicts order by vid, rank, s
  )
  select v.id, v.name, k.vid is null, k.kind, k.label, k.s, k.e, k.until
    from public.venues v
    left join ranked k on k.vid = v.id
   where v.is_active
   order by (k.vid is null) desc, v.name;
end;
$fn$;

grant execute on function public.venue_availability(date, time, time, uuid) to authenticated;

-- --- Talep denetimi: saatsizse gün bazlı ------------------------------------

create or replace function public.lead_conflict_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_range    tsrange;
  v_whole_day boolean := new.start_time is null or new.end_time is null;
  v_hint     text;
  v_conflict record;
begin
  -- Salon veya tarih yoksa denetlenecek bir şey yok; talep aşamasında bunlar
  -- gerçekten belirsiz olabilir.
  if new.venue_id is null or new.event_date is null then
    return new;
  end if;

  -- Kazanılan talep kendi rezervasyonuna işaret eder, kaybedilen talep arşiv.
  if new.status in ('kazanildi', 'kaybedildi') then
    return new;
  end if;

  v_range := public.event_range(new.event_date, new.start_time, new.end_time);

  -- Saat girilmemişse gün tamamen dolu sayıldı; kullanıcıya çıkış yolu söylensin.
  v_hint := case
    when v_whole_day then
      ' Belirli bir saat aralığı için uygunluğu görmek istiyorsanız başlangıç ve bitiş saatini girin.'
    else ' Farklı bir tarih veya salon seçin.'
  end;

  -- Danışsal kilide gerek yok: talep salonu işgal etmiyor, dolayısıyla bir
  -- yarış durumu müsaitlik verisini bozamaz. Bu bir iş kuralı denetimi.
  perform public.expire_venue_holds(new.venue_id);

  select 'rezervasyon'::text as kind, c.full_name as label,
         r.start_time as s, r.end_time as e, null::timestamptz as until
    into v_conflict
    from public.reservations r
    join public.customers c on c.id = r.customer_id
   where r.venue_id = new.venue_id
     and r.status <> 'iptal_edildi'
     -- Dönüşüm sonrası talebin kendi rezervasyonu engel sayılmasın.
     and r.id is distinct from new.reservation_id
     and tsrange(r.starts_at, r.ends_at, '[)') && v_range
   limit 1;

  if not found then
    select 'opsiyon'::text, c.full_name, h.start_time, h.end_time, h.expires_at
      into v_conflict
      from public.venue_holds h
      join public.leads l on l.id = h.lead_id
      join public.customers c on c.id = l.customer_id
     where h.venue_id = new.venue_id
       and h.status = 'aktif'
       and h.expires_at > now()
       -- Talebin kendi opsiyonu kendisini engellemesin.
       and h.lead_id is distinct from new.id
       and tsrange(h.starts_at, h.ends_at, '[)') && v_range
     limit 1;
  end if;

  if not found then
    return new;
  end if;

  if v_conflict.kind = 'opsiyon' then
    raise exception '% tarihinde bu salon % adına opsiyonlu (% - %, opsiyon bitişi %).%',
      to_char(new.event_date, 'DD.MM.YYYY'),
      v_conflict.label,
      to_char(v_conflict.s, 'HH24:MI'),
      to_char(v_conflict.e, 'HH24:MI'),
      to_char(v_conflict.until at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI'),
      v_hint
      using errcode = 'exclusion_violation';
  else
    raise exception '% tarihinde bu salonda % adına kesin rezervasyon var (% - %).%',
      to_char(new.event_date, 'DD.MM.YYYY'),
      v_conflict.label,
      to_char(v_conflict.s, 'HH24:MI'),
      to_char(v_conflict.e, 'HH24:MI'),
      v_hint
      using errcode = 'exclusion_violation';
  end if;
end;
$fn$;

-- --- Diğer guard'lar da ortak hesabı kullansın ------------------------------
-- Aralık mantığı üç yerde kopyalanmış hâlde durmasın; 0009'daki düzeltmenin
-- tekrar bozulma ihtimalini azaltıyor.

create or replace function public.reservation_hold_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_range    tsrange;
  v_conflict record;
begin
  if new.status = 'iptal_edildi' then
    return new;
  end if;

  v_range := public.event_range(new.event_date, new.start_time, new.end_time);

  perform pg_advisory_xact_lock(hashtextextended(new.venue_id::text, 0));
  perform public.expire_venue_holds(new.venue_id);

  select h.id, h.expires_at, c.full_name
    into v_conflict
    from public.venue_holds h
    join public.leads l on l.id = h.lead_id
    join public.customers c on c.id = l.customer_id
   where h.venue_id = new.venue_id
     and h.status = 'aktif'
     and h.reservation_id is distinct from new.id
     and tsrange(h.starts_at, h.ends_at, '[)') && v_range
   limit 1;

  if found then
    raise exception 'Bu salon ve saat aralığı % adına opsiyonlu (bitiş: %).',
      v_conflict.full_name,
      to_char(v_conflict.expires_at at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI')
      using errcode = 'exclusion_violation';
  end if;

  return new;
end;
$fn$;

create or replace function public.venue_hold_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_range    tsrange;
  v_conflict record;
begin
  if new.status <> 'aktif' then
    return new;
  end if;

  if tg_op = 'INSERT' and new.expires_at <= now() then
    raise exception 'Opsiyon bitiş zamanı gelecekte olmalı.'
      using errcode = 'check_violation';
  end if;

  v_range := public.event_range(new.event_date, new.start_time, new.end_time);

  perform pg_advisory_xact_lock(hashtextextended(new.venue_id::text, 0));
  perform public.expire_venue_holds(new.venue_id);

  select r.id, r.start_time, r.end_time, c.full_name
    into v_conflict
    from public.reservations r
    join public.customers c on c.id = r.customer_id
   where r.venue_id = new.venue_id
     and r.status <> 'iptal_edildi'
     and tsrange(r.starts_at, r.ends_at, '[)') && v_range
   limit 1;

  if found then
    raise exception 'Bu salon ve saat aralığında % adına kesin rezervasyon var (% - %).',
      v_conflict.full_name,
      to_char(v_conflict.start_time, 'HH24:MI'),
      to_char(v_conflict.end_time, 'HH24:MI')
      using errcode = 'exclusion_violation';
  end if;

  return new;
end;
$fn$;
