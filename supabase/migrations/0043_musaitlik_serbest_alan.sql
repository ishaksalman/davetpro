-- =============================================================================
-- DavetPro · 0043 · Müsaitlik sonucunda serbest alan bayrağı
--
-- Serbest alan ("Dış mekân", "Diğer") her zaman müsait. Arayüz bunu yeşil bir
-- "müsait" şeridiyle söylüyordu — doğru ama anlamsız: orada çakışma kuralı
-- zaten işlemiyor, bilgi kullanıcıya hiçbir şey katmıyor.
--
-- Bayrak SONUÇTA dönüyor, çağıran ekranda hesaplanmıyor: üç ekran bu
-- fonksiyonu kullanıyor ve biri unutursa aynı gereksiz şerit geri gelir.
--
-- Dönüş tipi değiştiği için önce düşürülüyor (42P13).
-- =============================================================================

drop function if exists public.venue_availability(date, time, time, uuid, uuid);

create function public.venue_availability(
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
  gap_minutes     integer,   -- komşu organizasyonla arada kalan dakika
  -- Serbest alan mı: arayüz müsaitlik bilgisini hiç göstermesin diye.
  -- Bayrak burada dönüyor ki çağıran her ekran ayrı ayrı bakmak zorunda
  -- kalmasın — biri unutursa "her zaman müsait" diye gereksiz uyarı çıkıyor.
  allows_overlap  boolean
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
         w.sev, w.kind, w.label, w.s, w.e, w.until, w.gap, v.allows_overlap
    from public.venues v
    -- Serbest alanda ("Diğer") çakışma aranmıyor: join hiç kurulmuyor,
    -- bütün w.* null kalıyor ve alan her zaman müsait görünüyor.
    left join worst w on w.vid = v.id and not v.allows_overlap
   where v.is_active
   -- Serbest alan listenin sonunda: her zaman boş olduğu için en üste
   -- çıkıp gerçek platoları aşağı itmesin.
   order by v.allows_overlap, (w.sev is null) desc, (w.sev = 'uyari') desc, v.name;
end;
$fn$;

revoke execute on function public.venue_availability(date, time, time, uuid, uuid) from public;
grant execute on function public.venue_availability(date, time, time, uuid, uuid) to authenticated;
