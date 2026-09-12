-- =============================================================================
-- DavetPro · 0029 · Müsaitlik sorgusu düzenlenen rezervasyonu atlayabilsin
--
-- venue_availability yalnızca talebin kendi opsiyonunu hariç tutabiliyordu
-- (p_ignore_lead_id). Rezervasyon formuna müsaitlik kontrolü eklenince, mevcut
-- bir rezervasyonu düzenlerken kayıt KENDİSİYLE çakışıyor görünüyordu.
--
-- Fonksiyon gövdesi 0011'den programla çıkarılıp yalnızca imza ve rezervasyon
-- filtresi değiştirildi; elle kopyalanmadı.
--
-- Üç imza da düşürülüyor: PostgreSQL, parametre varsayılanlarını değiştiren
-- bir create or replace'i reddediyor (42P13) ve eski imza ayakta kalırsa
-- çağrı belirsiz hale geliyor.
-- =============================================================================

drop function if exists public.venue_availability(date, time, time);
drop function if exists public.venue_availability(date, time, time, uuid);
drop function if exists public.venue_availability(date, time, time, uuid, uuid);

create or replace function public.venue_availability(
  p_event_date     date,
  p_start_time     time default null,
  p_end_time       time default null,
  p_ignore_lead_id uuid default null,
  -- Düzenlenen rezervasyonun kendisi çakışma sayılmasın.
  p_ignore_reservation_id uuid default null
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
       and (p_ignore_reservation_id is null or r.id <> p_ignore_reservation_id)
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

revoke execute on function public.venue_availability(date, time, time, uuid, uuid) from public;
grant execute on function public.venue_availability(date, time, time, uuid, uuid) to authenticated;
