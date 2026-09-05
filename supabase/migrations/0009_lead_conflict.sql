-- =============================================================================
-- DavetPro · 0009 · Talep çakışma denetimi
--
-- Talep salonu BLOKE ETMEZ (bu kural değişmedi): iki farklı müşteri aynı tarih
-- için talep açabilir. Ancak zaten kesin rezervasyona veya aktif opsiyona
-- verilmiş bir slot için yeni talep açmak satış hatası; kullanıcıya müsait bir
-- alternatif önerilmesi gerekir. Bu yüzden ters yönde denetim ekleniyor.
--
-- Denetim istemciye bırakılmıyor: form uyarısı yalnızca bilgilendirme, asıl
-- engel burada.
-- =============================================================================

create or replace function public.lead_conflict_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_range    tsrange;
  v_conflict record;
begin
  -- Talep aşamasında tarih/salon/saat henüz belirsiz olabilir; eksikse
  -- denetlenecek bir şey yok.
  if new.venue_id is null
     or new.event_date is null
     or new.start_time is null
     or new.end_time is null then
    return new;
  end if;

  -- Kazanılan talep kendi rezervasyonuna işaret eder, kaybedilen talep arşiv.
  -- İkisi de yeniden denetlenmez.
  if new.status in ('kazanildi', 'kaybedildi') then
    return new;
  end if;

  v_range := tsrange(
    (new.event_date + new.start_time),
    (new.event_date + new.end_time)
      + (case when new.end_time <= new.start_time
              then interval '1 day' else interval '0 day' end),
    '[)'
  );

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
    raise exception
      'Bu salon ve saat aralığı % adına opsiyonlu (bitiş: %). Farklı bir tarih veya salon seçin.',
      v_conflict.label,
      to_char(v_conflict.until at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI')
      using errcode = 'exclusion_violation';
  else
    raise exception
      'Bu salon ve saat aralığında % adına kesin rezervasyon var (% - %). Farklı bir tarih veya salon seçin.',
      v_conflict.label,
      to_char(v_conflict.s, 'HH24:MI'),
      to_char(v_conflict.e, 'HH24:MI')
      using errcode = 'exclusion_violation';
  end if;
end;
$fn$;

-- Elle çalıştırılan bir migration'ın ikinci kez çalıştırılması olağan;
-- "trigger already exists" hatası vermesin.
drop trigger if exists leads_conflict_guard on public.leads;
create trigger leads_conflict_guard
  before insert or update of venue_id, event_date, start_time, end_time, status
  on public.leads
  for each row execute function public.lead_conflict_guard();

-- =============================================================================
-- DÜZELTME · 0008'deki müsaitlik trigger'ları
--
-- Hata: BEFORE trigger'da NEW.starts_at / NEW.ends_at henüz hesaplanmamıştır
-- (stored generated kolonlar satır yazılmadan önce NULL'dır). tsrange(null,null)
-- sonsuz aralık üretiyor ve && her zaman TRUE dönüyordu; sonuç olarak aynı
-- salondaki HERHANGİ bir rezervasyon/opsiyon, tarihi ilgisiz olsa bile çakışma
-- sayılıyordu.
--
-- Çözüm: aralık, satırın kendi alanlarından (event_date + start/end_time) burada
-- hesaplanıyor. Karşı taraftaki (mevcut, yazılmış) satırların starts_at/ends_at
-- değerleri doğru olduğu için onlar olduğu gibi kullanılmaya devam ediyor.
-- =============================================================================

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

  v_range := tsrange(
    (new.event_date + new.start_time),
    (new.event_date + new.end_time)
      + (case when new.end_time <= new.start_time
              then interval '1 day' else interval '0 day' end),
    '[)'
  );

  perform pg_advisory_xact_lock(hashtextextended(new.venue_id::text, 0));
  perform public.expire_venue_holds(new.venue_id);

  select h.id, h.expires_at, c.full_name
    into v_conflict
    from public.venue_holds h
    join public.leads l on l.id = h.lead_id
    join public.customers c on c.id = l.customer_id
   where h.venue_id = new.venue_id
     and h.status = 'aktif'
     -- Dönüşümde talebin kendi opsiyonu engel olmasın; dönüştürme akışı
     -- opsiyonu önce 'donusturuldu' yapar, bu yalnızca ek güvenlik ağı.
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

  -- Kural yalnızca oluştururken geçerli. Güncellemede geçmiş bir bitiş zamanı
  -- "bu opsiyon artık geçerli değil" demektir; expire_venue_holds() kapatır.
  if tg_op = 'INSERT' and new.expires_at <= now() then
    raise exception 'Opsiyon bitiş zamanı gelecekte olmalı.'
      using errcode = 'check_violation';
  end if;

  v_range := tsrange(
    (new.event_date + new.start_time),
    (new.event_date + new.end_time)
      + (case when new.end_time <= new.start_time
              then interval '1 day' else interval '0 day' end),
    '[)'
  );

  perform pg_advisory_xact_lock(hashtextextended(new.venue_id::text, 0));
  -- Süresi dolmuş opsiyonlar EXCLUDE kısıtını tetiklemesin diye önce kapatılır.
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

-- =============================================================================
-- venue_availability · talebin kendi opsiyonunu yok sayma
--
-- Bir talep düzenlenirken kendi aktif opsiyonu "dolu" olarak görünüyor ve form
-- kaydetmeyi kilitliyordu. Trigger bunu zaten doğru ele alıyor; ekrandaki
-- kontrolün de aynı kuralı bilmesi gerekiyor.
-- =============================================================================

-- Elle çalıştırılan migration'lar sıra dışı veya ikinci kez çalıştırılabiliyor.
-- Her iki olası imza da düşürülüyor: aksi halde var olan bir fonksiyonun
-- üzerine daha az varsayılanla yazmaya çalışmak
-- "cannot remove parameter defaults" hatası veriyor.
drop function if exists public.venue_availability(date, time, time);
drop function if exists public.venue_availability(date, time, time, uuid);

create or replace function public.venue_availability(
  p_event_date    date,
  p_start_time    time,
  p_end_time      time,
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
  v_range tsrange := tsrange(
    (p_event_date + p_start_time),
    (p_event_date + p_end_time)
      + (case when p_end_time <= p_start_time then interval '1 day' else interval '0 day' end),
    '[)'
  );
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
