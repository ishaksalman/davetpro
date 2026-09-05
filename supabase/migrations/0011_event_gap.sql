-- =============================================================================
-- DavetPro · 0011 · Organizasyonlar arası asgari boşluk
--
-- Organizasyon bittiği anda salon boşalmıyor: masaların toplanması, temizlik,
-- yeni dekorasyon ve kurulum zaman alıyor. Bu güne kadar 23:00'te biten bir
-- düğünün üstüne 23:00 başlangıçlı ikinci bir organizasyon kabul ediliyordu.
--
-- Model: bir organizasyonun "bloke ettiği" aralık, bitişine asgari boşluk
-- eklenerek hesaplanıyor. İki kayıt da genişlediği için aradaki fark tam olarak
-- bu süre kadar oluyor; bu yüzden yalnızca bitiş tarafını genişletmek yeterli.
--
-- İki eşik var:
--   • 60 dakikadan az boşluk  → ENGEL. Kaydedilemez.
--   • 60-120 dakika arası     → UYARI. Kaydedilir, kullanıcıya söylenir.
--   • 120 dakika ve üzeri     → sessiz.
--
-- Uyarı yalnızca bilgilendirme olduğu için veritabanında zorlanmıyor; engel
-- ise trigger'da. Böylece "uyarıyı görmezden gelmek" bir kaçış yolu değil,
-- kasıtlı bir seçim oluyor.
--
-- reservations_no_overlap EXCLUDE kısıtı olduğu gibi kalıyor. O, "hiçbir
-- koşulda gerçek çakışma olmasın" garantisi; boşluk kuralı ise iş kuralı.
-- =============================================================================

-- --- Bloke aralığı ----------------------------------------------------------

create or replace function public.blocking_range(
  p_date    date,
  p_start   time,
  p_end     time,
  p_buffer  integer
)
returns tsrange
language sql
immutable
as $fn$
  select case
    when p_start is null or p_end is null
      -- Saat belirsizse gün tamamen bloke; hazırlık payı ertesi güne taşmasın.
      then tsrange(p_date::timestamp, (p_date + 1)::timestamp, '[)')
    else tsrange(
      p_date + p_start,
      (p_date + p_end)
        + (case when p_end <= p_start then interval '1 day' else interval '0 day' end)
        + make_interval(mins => coalesce(p_buffer, 0)),
      '[)'
    )
  end;
$fn$;

grant execute on function public.blocking_range(date, time, time, integer) to authenticated;


create or replace function public.min_gap_minutes()
returns integer language sql immutable as $fn$ select 60 $fn$;

create or replace function public.warn_gap_minutes()
returns integer language sql immutable as $fn$ select 120 $fn$;

grant execute on function public.min_gap_minutes() to authenticated;
grant execute on function public.warn_gap_minutes() to authenticated;

-- --- Rezervasyon ------------------------------------------------------------

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
      'Bu salonda % adına % - % arası bir organizasyon var. İki organizasyon arasında en az % dakika bırakılmalı.',
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
    raise exception 'Bu salon ve saat aralığı % adına opsiyonlu (bitiş: %).',
      v_conflict.full_name,
      to_char(v_conflict.expires_at at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI')
      using errcode = 'exclusion_violation';
  end if;

  return new;
end;
$fn$;

-- --- Opsiyon ----------------------------------------------------------------

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
      'Bu salonda % adına % - % arası kesin rezervasyon var. En az % dakika bırakılmalı.',
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
      'Bu salonda % adına % - % arası aktif bir opsiyon var. En az % dakika bırakılmalı.',
      v_conflict.label, to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'), v_gap
      using errcode = 'exclusion_violation';
  end if;

  return new;
end;
$fn$;

-- --- Talep ------------------------------------------------------------------

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
    raise exception '% tarihinde bu salon % adına opsiyonlu (% - %, opsiyon bitişi %).%',
      to_char(new.event_date, 'DD.MM.YYYY'), v_conflict.label,
      to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'),
      to_char(v_conflict.until at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI'),
      v_hint
      using errcode = 'exclusion_violation';
  else
    raise exception '% tarihinde bu salonda % adına organizasyon var (% - %).%',
      to_char(new.event_date, 'DD.MM.YYYY'), v_conflict.label,
      to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'), v_hint
      using errcode = 'exclusion_violation';
  end if;
end;
$fn$;

-- --- Müsaitlik: engel + uyarı ----------------------------------------------

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
  venue_id        uuid,
  venue_name      text,
  is_available    boolean,   -- yalnızca ENGEL varsa false; uyarıda true
  severity        text,      -- 'engel' | 'uyari' | null
  conflict_kind   text,      -- 'rezervasyon' | 'opsiyon'
  conflict_label  text,
  conflict_start  time,
  conflict_end    time,
  hold_expires_at timestamptz,
  gap_minutes     integer    -- komşu organizasyonla arada kalan dakika
)
language plpgsql
stable
set search_path = public, pg_temp
as $fn$
declare
  v_min  integer := public.min_gap_minutes();
  v_warn integer := public.warn_gap_minutes();
  v_rng  tsrange := public.event_range(p_event_date, p_start_time, p_end_time);
  -- Komşu arama penceresi iki yöne de açılmalı: uyarıya konu organizasyon
  -- adayın öncesinde de olabilir. blocking_range yalnızca bitişi genişletiyor;
  -- o, engel kuralı için doğru ama yakınlık taraması için yetersiz.
  v_search tsrange := tsrange(
    lower(v_rng) - make_interval(mins => public.warn_gap_minutes()),
    upper(v_rng) + make_interval(mins => public.warn_gap_minutes()),
    '[)'
  );
begin
  return query
  with nearby as (
    -- Uyarı eşiğine kadar genişletilmiş aralığa değen her kayıt.
    select r.venue_id as vid, 'rezervasyon'::text as kind, c.full_name as label,
           r.start_time as s, r.end_time as e, null::timestamptz as until,
           public.event_range(r.event_date, r.start_time, r.end_time) as rng
      from public.reservations r
      join public.customers c on c.id = r.customer_id
     where r.event_date between p_event_date - 1 and p_event_date + 1
       and r.status <> 'iptal_edildi'
       and public.event_range(r.event_date, r.start_time, r.end_time) && v_search
    union all
    select h.venue_id, 'opsiyon', c.full_name, h.start_time, h.end_time, h.expires_at,
           public.event_range(h.event_date, h.start_time, h.end_time)
      from public.venue_holds h
      join public.leads l on l.id = h.lead_id
      join public.customers c on c.id = l.customer_id
     where h.event_date between p_event_date - 1 and p_event_date + 1
       and h.status = 'aktif'
       and h.expires_at > now()
       and (p_ignore_lead_id is null or h.lead_id <> p_ignore_lead_id)
       and public.event_range(h.event_date, h.start_time, h.end_time) && v_search
  ),
  scored as (
    select n.*,
           -- Gerçek çakışmada boşluk yok; aksi halde iki aralık arasındaki fark.
           case
             when n.rng && v_rng then null
             when lower(n.rng) >= upper(v_rng)
               then (extract(epoch from (lower(n.rng) - upper(v_rng))) / 60)::integer
             else (extract(epoch from (lower(v_rng) - upper(n.rng))) / 60)::integer
           end as gap
      from nearby n
  ),
  labeled as (
    select s.*,
           case when s.gap is null or s.gap < v_min then 'engel' else 'uyari' end as sev
      from scored s
  ),
  -- Salon başına en kötü durum: engel uyarıdan önce, sonra en dar boşluk.
  worst as (
    select distinct on (vid) *
      from labeled
     order by vid, (sev = 'engel') desc, coalesce(gap, -1), s
  )
  select v.id, v.name,
         coalesce(w.sev, '') <> 'engel',
         w.sev, w.kind, w.label, w.s, w.e, w.until, w.gap
    from public.venues v
    left join worst w on w.vid = v.id
   where v.is_active
   order by (w.sev is null) desc, (w.sev = 'uyari') desc, v.name;
end;
$fn$;

grant execute on function public.venue_availability(date, time, time, uuid) to authenticated;
