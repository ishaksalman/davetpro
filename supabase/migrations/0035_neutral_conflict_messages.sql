-- =============================================================================
-- DavetPro · 0035 · Çakışma mesajlarından "salon" kelimesi çıkarıldı
--
-- Mesajlar tetikleyicilerin içinde yazılı ve zaten Türkçe olduğu için çeviri
-- katmanından olduğu gibi geçiyorlar. Fotoğrafçı hesabında kullanıcı "Bu
-- salonda ... organizasyon var" cümlesini görüyordu.
--
-- Yeni dil kaynağa değil ORGANİZASYONA odaklanıyor: hangi kaynağın dolu
-- olduğu kullanıcının seçtiği alandan zaten belli. Böylece mesaj her iki iş
-- için de doğru kalıyor ve ileride yeni bir dikey eklenince yine değişmiyor.
--
-- Gövdeler 0011'den programla çıkarıldı; yalnızca metinler değişti, mantığa
-- dokunulmadı.
-- =============================================================================

create or replace function public.reservation_hold_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_gap      integer := public.min_gap_minutes();
  v_range    tsrange;
  v_conflict record;
begin
  if new.status = 'iptal_edildi' then
    return new;
  end if;

  v_range := public.blocking_range(new.event_date, new.start_time, new.end_time, v_gap);

  perform pg_advisory_xact_lock(hashtextextended(new.venue_id::text, 0));
  perform public.expire_venue_holds(new.venue_id);

  select r.start_time as s, r.end_time as e, c.full_name as label
    into v_conflict
    from public.reservations r
    join public.customers c on c.id = r.customer_id
   where r.venue_id = new.venue_id
     and r.status <> 'iptal_edildi'
     and r.id is distinct from new.id
     and public.blocking_range(r.event_date, r.start_time, r.end_time, v_gap) && v_range
   limit 1;

  if found then
    raise exception
      '% adına % - % arası bir organizasyon var. İki organizasyon arasında en az % dakika bırakılmalı.',
      v_conflict.label, to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'), v_gap
      using errcode = 'exclusion_violation';
  end if;

  select h.expires_at, c.full_name
    into v_conflict
    from public.venue_holds h
    join public.leads l on l.id = h.lead_id
    join public.customers c on c.id = l.customer_id
   where h.venue_id = new.venue_id
     and h.status = 'aktif'
     and h.reservation_id is distinct from new.id
     and public.blocking_range(h.event_date, h.start_time, h.end_time, v_gap) && v_range
   limit 1;

  if found then
    raise exception 'Seçilen saat aralığı % adına opsiyonlu (bitiş: %).',
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
  v_gap      integer := public.min_gap_minutes();
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

  v_range := public.blocking_range(new.event_date, new.start_time, new.end_time, v_gap);

  perform pg_advisory_xact_lock(hashtextextended(new.venue_id::text, 0));
  perform public.expire_venue_holds(new.venue_id);

  select r.start_time as s, r.end_time as e, c.full_name as label
    into v_conflict
    from public.reservations r
    join public.customers c on c.id = r.customer_id
   where r.venue_id = new.venue_id
     and r.status <> 'iptal_edildi'
     and public.blocking_range(r.event_date, r.start_time, r.end_time, v_gap) && v_range
   limit 1;

  if found then
    raise exception
      '% adına % - % arası kesin rezervasyon var. En az % dakika bırakılmalı.',
      v_conflict.label, to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'), v_gap
      using errcode = 'exclusion_violation';
  end if;

  select h.start_time as s, h.end_time as e, c.full_name as label
    into v_conflict
    from public.venue_holds h
    join public.leads l on l.id = h.lead_id
    join public.customers c on c.id = l.customer_id
   where h.venue_id = new.venue_id
     and h.status = 'aktif'
     and h.id is distinct from new.id
     and public.blocking_range(h.event_date, h.start_time, h.end_time, v_gap) && v_range
   limit 1;

  if found then
    raise exception
      '% adına % - % arası aktif bir opsiyon var. En az % dakika bırakılmalı.',
      v_conflict.label, to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'), v_gap
      using errcode = 'exclusion_violation';
  end if;

  return new;
end;
$fn$;

create or replace function public.lead_conflict_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_gap       integer := public.min_gap_minutes();
  v_range     tsrange;
  v_whole_day boolean := new.start_time is null or new.end_time is null;
  v_hint      text;
  v_conflict  record;
begin
  if new.venue_id is null or new.event_date is null then
    return new;
  end if;

  if new.status in ('kazanildi', 'kaybedildi') then
    return new;
  end if;

  v_range := public.blocking_range(new.event_date, new.start_time, new.end_time, v_gap);

  v_hint := case
    when v_whole_day then
      ' Belirli bir saat aralığı için uygunluğu görmek istiyorsanız başlangıç ve bitiş saatini girin.'
    else
      format(' İki organizasyon arasında en az %s dakika bırakılmalı.', v_gap)
  end;

  perform public.expire_venue_holds(new.venue_id);

  select 'rezervasyon'::text as kind, c.full_name as label,
         r.start_time as s, r.end_time as e, null::timestamptz as until
    into v_conflict
    from public.reservations r
    join public.customers c on c.id = r.customer_id
   where r.venue_id = new.venue_id
     and r.status <> 'iptal_edildi'
     and r.id is distinct from new.reservation_id
     and public.blocking_range(r.event_date, r.start_time, r.end_time, v_gap) && v_range
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
       and h.lead_id is distinct from new.id
       and public.blocking_range(h.event_date, h.start_time, h.end_time, v_gap) && v_range
     limit 1;
  end if;

  if not found then
    return new;
  end if;

  if v_conflict.kind = 'opsiyon' then
    raise exception '% tarihinde % adına opsiyon var (% - %, opsiyon bitişi %).%',
      to_char(new.event_date, 'DD.MM.YYYY'), v_conflict.label,
      to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'),
      to_char(v_conflict.until at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI'),
      v_hint
      using errcode = 'exclusion_violation';
  else
    raise exception '% tarihinde % adına organizasyon var (% - %).%',
      to_char(new.event_date, 'DD.MM.YYYY'), v_conflict.label,
      to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'), v_hint
      using errcode = 'exclusion_violation';
  end if;
end;
$fn$;
