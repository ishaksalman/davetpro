-- =============================================================================
-- DavetPro · 0037 · Platolar ve serbest alan
--
-- Fotoğrafçıda kısıtlı kaynak "ekip" değil ÇEKİM ALANI: aynı platoda aynı
-- saatte iki çekim olmaz. Ekip ayrı bir kavram, 0038'de geliyor.
--
-- "Diğer" platosu bunun istisnası. Müşterinin evinde, dışarıda, başka bir
-- şehirde yapılan çekimlerin hepsi aynı satıra düşüyor; orada çakışma
-- yasağı anlamsız olurdu.
--
-- NEDEN DENORMALİZE KOLON: çakışmayı `exclude using gist` kısıtı tutuyor ve
-- kısıtın WHERE yüklemi yalnızca kendi satırının kolonlarını görebiliyor —
-- venues'a join atamıyor. Bayrağı rezervasyona kopyalamak, kısıtı yerinde
-- tutmanın tek yolu. Kısıt yerinde kaldığı için eşzamanlı iki kaydın
-- yarışıp ikisinin birden geçmesi hâlâ imkânsız; tetikleyici tek başına bu
-- garantiyi veremezdi.
-- =============================================================================

alter table public.venues
  add column if not exists allows_overlap boolean not null default false;

comment on column public.venues.allows_overlap is
  'true ise bu alanda çakışma kontrolü yapılmaz ("Diğer" / serbest alan).';

alter table public.reservations
  add column if not exists venue_allows_overlap boolean not null default false;
alter table public.venue_holds
  add column if not exists venue_allows_overlap boolean not null default false;

comment on column public.reservations.venue_allows_overlap is
  'venues.allows_overlap kopyası. EXCLUDE kısıtı join atamadığı için burada.';

-- --- Kopyayı güncel tutan tetikleyiciler --------------------------------------

create or replace function public.sync_venue_allows_overlap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  new.venue_allows_overlap := coalesce(
    (select v.allows_overlap from public.venues v where v.id = new.venue_id), false);
  return new;
end;
$fn$;

drop trigger if exists reservations_allows_overlap_sync on public.reservations;
create trigger reservations_allows_overlap_sync
  before insert or update of venue_id on public.reservations
  for each row execute function public.sync_venue_allows_overlap();

drop trigger if exists venue_holds_allows_overlap_sync on public.venue_holds;
create trigger venue_holds_allows_overlap_sync
  before insert or update of venue_id on public.venue_holds
  for each row execute function public.sync_venue_allows_overlap();

-- Platonun bayrağı sonradan değişirse mevcut kayıtlar da izlemeli.
create or replace function public.propagate_venue_allows_overlap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  update public.reservations set venue_allows_overlap = new.allows_overlap
   where venue_id = new.id and venue_allows_overlap is distinct from new.allows_overlap;
  update public.venue_holds set venue_allows_overlap = new.allows_overlap
   where venue_id = new.id and venue_allows_overlap is distinct from new.allows_overlap;
  return new;
exception
  -- Serbest alan kapatılırken üzerinde çakışan kayıtlar varsa kısıt haklı
  -- olarak reddediyor. Ham kısıt hatası kullanıcıya bir şey anlatmıyor;
  -- ne yapması gerektiğini söyleyen mesaja çevriliyor.
  when exclusion_violation then
    raise exception
      '"%" alanında aynı saate denk gelen kayıtlar var. Çakışma kontrolünü '
      'açabilmek için önce bu kayıtları farklı alanlara taşıyın veya saatlerini '
      'değiştirin.', new.name
      using errcode = 'exclusion_violation';
end;
$fn$;

drop trigger if exists venues_allows_overlap_propagate on public.venues;
create trigger venues_allows_overlap_propagate
  after update of allows_overlap on public.venues
  for each row execute function public.propagate_venue_allows_overlap();

-- Mevcut satırlar için bir kereye mahsus doldurma.
update public.reservations r set venue_allows_overlap = v.allows_overlap
  from public.venues v
 where v.id = r.venue_id and r.venue_allows_overlap is distinct from v.allows_overlap;
update public.venue_holds h set venue_allows_overlap = v.allows_overlap
  from public.venues v
 where v.id = h.venue_id and h.venue_allows_overlap is distinct from v.allows_overlap;

-- --- Kısıtlar serbest alanı atlasın -------------------------------------------

alter table public.reservations drop constraint if exists reservations_no_overlap;
alter table public.reservations
  add constraint reservations_no_overlap exclude using gist (
    venue_id with =,
    tsrange(
      (event_date + start_time),
      (event_date + end_time)
        + (case when end_time <= start_time then interval '1 day' else interval '0 day' end),
      '[)'
    ) with &&
  ) where (status <> 'iptal_edildi' and not venue_allows_overlap);

alter table public.venue_holds drop constraint if exists venue_holds_no_overlap;
alter table public.venue_holds
  add constraint venue_holds_no_overlap exclude using gist (
    venue_id with =,
    tsrange(
      (event_date + start_time),
      (event_date + end_time)
        + (case when end_time <= start_time then interval '1 day' else interval '0 day' end),
      '[)'
    ) with &&
  ) where (status = 'aktif' and not venue_allows_overlap);

-- --- Korumalar da atlasın ------------------------------------------------------

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
  v_isim     text;
begin
  -- SERBEST ALAN: "Diğer" platosunda çakışma kuralı işlemiyor — müşterinin
  -- mekânı, dış çekim, sokak. Aynı anda iki ayrı yerde olunabilir.
  --
  -- Bayrak denormalize kolondan değil platonun kendisinden okunuyor: o kolonu
  -- dolduran da bir BEFORE tetikleyicisi ve ikisinin çalışma sırası trigger
  -- adına bağlı. Buradan okumak o sıralama bağımlılığını kaldırıyor.
  if coalesce(
       (select v.allows_overlap from public.venues v where v.id = new.venue_id),
       false) then
    return new;
  end if;

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
    v_isim := public.event_noun(new.business_id);
    raise exception
      '% adına % - % arası bir % var. İki % arasında en az % dakika bırakılmalı.',
      v_conflict.label, to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'),
      v_isim, v_isim, v_gap
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
  -- SERBEST ALAN: "Diğer" platosunda çakışma kuralı işlemiyor — müşterinin
  -- mekânı, dış çekim, sokak. Aynı anda iki ayrı yerde olunabilir.
  --
  -- Bayrak denormalize kolondan değil platonun kendisinden okunuyor: o kolonu
  -- dolduran da bir BEFORE tetikleyicisi ve ikisinin çalışma sırası trigger
  -- adına bağlı. Buradan okumak o sıralama bağımlılığını kaldırıyor.
  if coalesce(
       (select v.allows_overlap from public.venues v where v.id = new.venue_id),
       false) then
    return new;
  end if;

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
      '% adına % - % arası kesin rezervasyon var. İki % arasında en az % dakika bırakılmalı.',
      v_conflict.label, to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'),
      public.event_noun(new.business_id), v_gap
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
      '% adına % - % arası aktif bir opsiyon var. İki % arasında en az % dakika bırakılmalı.',
      v_conflict.label, to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'),
      public.event_noun(new.business_id), v_gap
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
  -- SERBEST ALAN: "Diğer" platosunda çakışma kuralı işlemiyor — müşterinin
  -- mekânı, dış çekim, sokak. Aynı anda iki ayrı yerde olunabilir.
  --
  -- Bayrak denormalize kolondan değil platonun kendisinden okunuyor: o kolonu
  -- dolduran da bir BEFORE tetikleyicisi ve ikisinin çalışma sırası trigger
  -- adına bağlı. Buradan okumak o sıralama bağımlılığını kaldırıyor.
  if coalesce(
       (select v.allows_overlap from public.venues v where v.id = new.venue_id),
       false) then
    return new;
  end if;

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
    raise exception '% tarihinde % adına % var (% - %).%',
      to_char(new.event_date, 'DD.MM.YYYY'), v_conflict.label,
      public.event_noun(new.business_id),
      to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'), v_hint
      using errcode = 'exclusion_violation';
  end if;
end;
$fn$;

-- --- Müsaitlik: serbest alan her zaman boş -------------------------------------

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
    -- Serbest alanda ("Diğer") çakışma aranmıyor: join hiç kurulmuyor,
    -- bütün w.* null kalıyor ve alan her zaman müsait görünüyor.
    left join worst w on w.vid = v.id and not v.allows_overlap
   where v.is_active
   -- Serbest alan listenin sonunda: her zaman boş olduğu için en üste
   -- çıkıp gerçek platoları aşağı itmesin.
   order by v.allows_overlap, (w.sev is null) desc, (w.sev = 'uyari') desc, v.name;
end;
$fn$;

-- --- Kurulum: fotoğrafçıya "Diğer" platosu ------------------------------------

create or replace function public.create_business_with_owner(
  p_business_name text,
  p_full_name     text,
  -- Varsayılan 'salon': eski imzayla yapılan çağrılar (varsa) aynı davranır.
  p_business_type public.business_type default 'salon'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_uid         uuid := auth.uid();
  v_business_id uuid;
  v_category    text;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Bu kullanıcı zaten bir işletmeye bağlı.' using errcode = 'unique_violation';
  end if;

  insert into public.businesses (name, business_type)
  values (btrim(p_business_name), p_business_type)
  returning id into v_business_id;

  insert into public.profiles (id, business_id, full_name, role, can_view_finance)
  values (v_uid, v_business_id, btrim(p_full_name), 'owner', true);

  -- Gider kalemleri işin cinsine göre: salon mutfak ve mekân gideri yazıyor,
  -- fotoğrafçı ekipman ve baskı.
  foreach v_category in array (
    case p_business_type
      when 'fotografci' then array[
        'Personel / Asistan', 'Ekipman', 'Ekipman Bakım', 'Albüm / Baskı',
        'Ulaşım', 'Retouch / Kurgu', 'Yazılım ve Depolama', 'Kira',
        'Reklam', 'Vergi', 'Diğer'
      ]
      else array[
        'Personel', 'Catering / Yemek', 'İçecek', 'Dekorasyon', 'Müzik / DJ',
        'Fotoğraf / Video', 'Temizlik', 'Elektrik / Doğalgaz', 'Kira',
        'Bakım / Onarım', 'Reklam', 'Vergi', 'Diğer'
      ]
    end
  ) loop
    insert into public.expense_categories (business_id, name)
    values (v_business_id, v_category);
  end loop;

  -- Fotoğrafçıda çekimlerin çoğu kendi platosunda değil: müşterinin evinde,
  -- dışarıda, başka şehirde. Hepsi bu satıra düşüyor ve burada çakışma
  -- yasağı işlemiyor. Salonda böyle bir şey yok — mekân sabit.
  if p_business_type = 'fotografci' then
    insert into public.venues (business_id, name, description, allows_overlap)
    values (v_business_id, 'Diğer',
            'Plato dışı çekimler: müşterinin mekânı, dış çekim, şehir dışı.', true);
  end if;

  insert into public.contract_templates (business_id, body)
  values (v_business_id, public.default_contract_body(p_business_type));

  return v_business_id;
end;
$fn$;
