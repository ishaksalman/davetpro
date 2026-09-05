-- =============================================================================
-- DavetPro · 0008 · Talepler, Teklifler ve Opsiyonlar (satış hattı)
--
-- Rezervasyon öncesindeki süreç: talep → görüşme → teklif → opsiyon →
-- rezervasyon. Rezervasyon, müşteri, paket ve finans yapıları olduğu gibi
-- kalır; bu katman onların üzerine kurulur ve dönüşüm anında mevcut
-- save_reservation() akışını kullanır.
-- =============================================================================

-- --- Enum'lar ---------------------------------------------------------------

create type public.lead_status as enum (
  'yeni',            -- Yeni talep
  'gorusuluyor',     -- Görüşülüyor
  'teklif_verildi',  -- Teklif verildi
  'opsiyonlu',       -- Tarih opsiyona alındı
  'kazanildi',       -- Rezervasyona dönüştü
  'kaybedildi'
);

-- Hangi kanalın rezervasyon getirdiğini ölçebilmek için talebin kaynağı.
create type public.lead_source as enum (
  'whatsapp', 'instagram', 'telefon', 'web', 'referans', 'google', 'diger'
);

create type public.lead_lost_reason as enum (
  'fiyat', 'tarih', 'baska_salon', 'vazgecti', 'ulasilamadi', 'diger'
);

create type public.lead_activity_type as enum (
  'telefon', 'whatsapp', 'instagram', 'yuz_yuze', 'eposta', 'not', 'sistem'
);

create type public.quote_status as enum (
  'taslak', 'gonderildi', 'kabul', 'reddedildi', 'suresi_doldu'
);

create type public.hold_status as enum (
  'aktif', 'suresi_doldu', 'donusturuldu', 'iptal'
);

-- --- Talepler ---------------------------------------------------------------
-- Müşteri kaydı talep açılırken oluşturulur veya mevcut kayda bağlanır;
-- böylece aynı kişi için ikinci bir müşteri kaydı üremez.

create table public.leads (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses (id) on delete cascade,
  customer_id        uuid not null,
  venue_id           uuid,
  package_id         uuid,
  organization_type  public.organization_type not null default 'dugun',
  status             public.lead_status not null default 'yeni',
  source             public.lead_source not null default 'telefon',

  -- Talep aşamasında tarih henüz kesin değil; bu yüzden hepsi opsiyonel.
  event_date         date,
  alt_event_date     date,
  start_time         time,
  end_time           time,
  guest_count        integer check (guest_count is null or guest_count > 0),

  assigned_to        uuid references public.profiles (id) on delete set null,
  next_follow_up_at  timestamptz,
  last_contact_at    timestamptz not null default now(),

  lost_reason        public.lead_lost_reason,
  lost_note          text,

  -- Dönüşüm sonrası bağlantı. Bir rezervasyon en fazla bir talepten doğar.
  reservation_id     uuid,
  converted_at       timestamptz,

  notes              text,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  unique (id, business_id),
  unique (reservation_id),

  foreign key (customer_id, business_id)
    references public.customers (id, business_id) on delete restrict,
  foreign key (venue_id, business_id)
    references public.venues (id, business_id) on delete set null (venue_id),
  foreign key (package_id, business_id)
    references public.packages (id, business_id) on delete set null (package_id),
  foreign key (reservation_id, business_id)
    references public.reservations (id, business_id) on delete set null (reservation_id),

  -- Kaybetme nedeni yalnızca kaybedilen talepte anlamlı ve orada zorunlu.
  constraint leads_lost_reason_required check (
    (status = 'kaybedildi' and lost_reason is not null)
    or (status <> 'kaybedildi' and lost_reason is null)
  ),
  constraint leads_lost_note_required check (
    lost_reason is distinct from 'diger'
    or length(btrim(coalesce(lost_note, ''))) > 0
  ),
  constraint leads_time_pair check (
    (start_time is null) = (end_time is null)
  )
);

create index leads_business_status_idx on public.leads (business_id, status);
create index leads_business_created_idx on public.leads (business_id, created_at desc);
create index leads_event_date_idx on public.leads (business_id, event_date);
create index leads_customer_idx on public.leads (customer_id);
create index leads_follow_up_idx on public.leads (business_id, next_follow_up_at)
  where status not in ('kazanildi', 'kaybedildi');

-- --- Görüşme geçmişi --------------------------------------------------------

create table public.lead_activities (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  lead_id      uuid not null,
  type         public.lead_activity_type not null default 'not',
  note         text,
  -- Sistem kayıtları (durum değişikliği, teklif oluşturma) kullanıcı
  -- notlarından ayrılsın diye işaretleniyor.
  is_system    boolean not null default false,
  occurred_at  timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),

  foreign key (lead_id, business_id)
    references public.leads (id, business_id) on delete cascade,
  constraint lead_activities_note_required
    check (is_system or length(btrim(coalesce(note, ''))) > 0)
);

create index lead_activities_lead_idx
  on public.lead_activities (lead_id, occurred_at desc);

-- --- Teklifler --------------------------------------------------------------
-- Revizyon = yeni teklif satırı. Eski sürüm hiç silinmez.

create table public.quote_counters (
  business_id uuid not null references public.businesses (id) on delete cascade,
  year        integer not null,
  last_no     integer not null default 0,
  primary key (business_id, year)
);

create table public.quotes (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses (id) on delete cascade,
  lead_id         uuid not null,
  quote_number    text not null,
  version         integer not null default 1 check (version > 0),
  status          public.quote_status not null default 'taslak',

  venue_id        uuid,
  package_id      uuid,
  guest_count     integer check (guest_count is null or guest_count > 0),

  -- Para alanları numeric(12,2); float kullanılmıyor.
  package_amount  numeric(12, 2) not null default 0 check (package_amount >= 0),
  -- quote_items toplamı; trigger ile güncel tutuluyor.
  extras_amount   numeric(12, 2) not null default 0 check (extras_amount >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  total_amount    numeric(12, 2)
    generated always as (package_amount + extras_amount - discount_amount) stored,

  valid_until     date,
  notes           text,
  sent_at         timestamptz,
  decided_at      timestamptz,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (id, business_id),
  unique (business_id, quote_number),
  unique (lead_id, version),

  foreign key (lead_id, business_id)
    references public.leads (id, business_id) on delete cascade,
  foreign key (venue_id, business_id)
    references public.venues (id, business_id) on delete set null (venue_id),
  foreign key (package_id, business_id)
    references public.packages (id, business_id) on delete set null (package_id),

  -- İndirim paket + ek hizmet toplamını aşamaz (toplam negatife düşmesin).
  constraint quotes_discount_within_total
    check (discount_amount <= package_amount + extras_amount)
);

create index quotes_lead_idx on public.quotes (lead_id, version desc);
create index quotes_business_idx on public.quotes (business_id, created_at desc);
-- Süresi geçen teklifleri tarayan iş için dar bir indeks.
create index quotes_expiry_idx on public.quotes (valid_until)
  where status in ('taslak', 'gonderildi');

create table public.quote_items (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  quote_id    uuid not null,
  name        text not null check (length(btrim(name)) > 0),
  amount      numeric(12, 2) not null check (amount >= 0),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),

  foreign key (quote_id, business_id)
    references public.quotes (id, business_id) on delete cascade
);

create index quote_items_quote_idx on public.quote_items (quote_id, sort_order);

-- --- Opsiyonlar (tarih tutma) ----------------------------------------------
-- Rezervasyonla aynı zaman modeli: gece yarısını aşan saatler için üretilmiş
-- kolonlar ve aynı çakışma mantığı.

create table public.venue_holds (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  lead_id        uuid not null,
  venue_id       uuid not null,
  event_date     date not null,
  start_time     time not null,
  end_time       time not null,
  expires_at     timestamptz not null,
  status         public.hold_status not null default 'aktif',
  reservation_id uuid,
  note           text,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  starts_at timestamp generated always as (event_date + start_time) stored,
  ends_at   timestamp generated always as (
    (event_date + end_time)
    + (case when end_time <= start_time then interval '1 day' else interval '0 day' end)
  ) stored,

  unique (id, business_id),

  foreign key (lead_id, business_id)
    references public.leads (id, business_id) on delete cascade,
  foreign key (venue_id, business_id)
    references public.venues (id, business_id) on delete restrict,
  foreign key (reservation_id, business_id)
    references public.reservations (id, business_id) on delete set null (reservation_id),

  -- İki aktif opsiyon aynı salonda çakışamaz. Yüklem yalnızca status'e
  -- bakabilir (now() immutable değil); süresi geçenler kontrolden hemen önce
  -- expire_venue_holds() ile 'suresi_doldu'ya çekiliyor.
  constraint venue_holds_no_overlap exclude using gist (
    venue_id with =,
    tsrange(
      (event_date + start_time),
      (event_date + end_time)
        + (case when end_time <= start_time then interval '1 day' else interval '0 day' end),
      '[)'
    ) with &&
  ) where (status = 'aktif')
);

create index venue_holds_lead_idx on public.venue_holds (lead_id);
create index venue_holds_venue_date_idx on public.venue_holds (venue_id, event_date);
create index venue_holds_active_idx on public.venue_holds (business_id, expires_at)
  where status = 'aktif';

-- --- Varsayılanlar ve updated_at -------------------------------------------

alter table public.leads           alter column business_id set default public.current_business_id();
alter table public.lead_activities alter column business_id set default public.current_business_id();
alter table public.quotes          alter column business_id set default public.current_business_id();
alter table public.quote_items     alter column business_id set default public.current_business_id();
alter table public.venue_holds     alter column business_id set default public.current_business_id();

create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create trigger quotes_set_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();
create trigger venue_holds_set_updated_at before update on public.venue_holds
  for each row execute function public.set_updated_at();

create trigger leads_set_created_by before insert on public.leads
  for each row execute function public.set_created_by();
create trigger lead_activities_set_created_by before insert on public.lead_activities
  for each row execute function public.set_created_by();
create trigger quotes_set_created_by before insert on public.quotes
  for each row execute function public.set_created_by();
create trigger venue_holds_set_created_by before insert on public.venue_holds
  for each row execute function public.set_created_by();

-- =============================================================================
-- Müsaitlik: rezervasyon + aktif opsiyon birlikte
--
-- Aynı tablo içindeki çakışmayı EXCLUDE kısıtları yakalıyor. Tablolar arası
-- çakışma (rezervasyon ↔ opsiyon) tek bir kısıtla ifade edilemediği için
-- trigger ile denetleniyor. Yarış durumuna karşı önce salon bazında danışsal
-- kilit alınıyor: aynı salon için eşzamanlı iki işlem sıraya giriyor, ikincisi
-- birincinin commit'ini gördükten sonra kontrol ediyor.
-- =============================================================================

-- Süresi dolan opsiyonları kapatır. Yalnızca zaten süresi geçmiş satırlara
-- dokunduğu için güvenlik açısından nötr; security definer olması RLS'e
-- takılmadan (ör. başka kullanıcının talebindeki opsiyon) çalışmasını sağlıyor.
create or replace function public.expire_venue_holds(p_venue_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_count integer;
begin
  update public.venue_holds
     set status = 'suresi_doldu'
   where status = 'aktif'
     and expires_at <= now()
     and (p_venue_id is null or venue_id = p_venue_id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$fn$;

comment on function public.expire_venue_holds(uuid) is
  'Süresi dolan opsiyonları kapatır. Salon müsaitliği hesaplanmadan önce çağrılır.';

-- Rezervasyon eklenirken/değişirken aktif opsiyonlarla çakışma denetimi.
create or replace function public.reservation_hold_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_conflict record;
begin
  if new.status = 'iptal_edildi' then
    return new;
  end if;

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
     and tsrange(h.starts_at, h.ends_at, '[)')
         && tsrange(new.starts_at, new.ends_at, '[)')
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

-- Opsiyon eklenirken/değişirken kesin rezervasyonlarla çakışma denetimi.
create or replace function public.venue_hold_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
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

  perform pg_advisory_xact_lock(hashtextextended(new.venue_id::text, 0));
  -- Süresi dolmuş opsiyonlar EXCLUDE kısıtını tetiklemesin diye önce kapatılır.
  perform public.expire_venue_holds(new.venue_id);

  select r.id, r.start_time, r.end_time, c.full_name
    into v_conflict
    from public.reservations r
    join public.customers c on c.id = r.customer_id
   where r.venue_id = new.venue_id
     and r.status <> 'iptal_edildi'
     and tsrange(r.starts_at, r.ends_at, '[)')
         && tsrange(new.starts_at, new.ends_at, '[)')
   limit 1;

  if found then
    raise exception 'Bu salon ve saat aralığında % adına kesin rezervasyon var.',
      v_conflict.full_name
      using errcode = 'exclusion_violation';
  end if;

  return new;
end;
$fn$;

create trigger reservations_hold_guard
  before insert or update of venue_id, event_date, start_time, end_time, status
  on public.reservations
  for each row execute function public.reservation_hold_guard();

create trigger venue_holds_reservation_guard
  before insert or update of venue_id, event_date, start_time, end_time, status, expires_at
  on public.venue_holds
  for each row execute function public.venue_hold_guard();

-- =============================================================================
-- Görüşme geçmişi: önemli olaylar otomatik yazılır
-- =============================================================================

create or replace function public.log_lead_activity(
  p_lead_id uuid, p_note text
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $fn$
  insert into public.lead_activities (business_id, lead_id, type, note, is_system)
  select business_id, id, 'sistem', p_note, true
  from public.leads where id = p_lead_id;
$fn$;

create or replace function public.leads_activity_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_labels constant jsonb := jsonb_build_object(
    'yeni', 'Yeni talep', 'gorusuluyor', 'Görüşülüyor',
    'teklif_verildi', 'Teklif verildi', 'opsiyonlu', 'Opsiyonlu',
    'kazanildi', 'Kazanıldı', 'kaybedildi', 'Kaybedildi'
  );
begin
  if tg_op = 'INSERT' then
    perform public.log_lead_activity(new.id, 'Talep oluşturuldu.');
  elsif new.status is distinct from old.status then
    if new.status = 'kaybedildi' then
      perform public.log_lead_activity(
        new.id,
        'Talep kaybedildi olarak işaretlendi.'
        || coalesce(' Neden: ' || nullif(btrim(new.lost_note), ''), ''));
    elsif new.status = 'kazanildi' then
      perform public.log_lead_activity(new.id, 'Talep rezervasyona dönüştürüldü.');
    else
      perform public.log_lead_activity(
        new.id,
        'Durum değiştirildi: ' || (v_labels ->> old.status::text)
        || ' → ' || (v_labels ->> new.status::text));
    end if;
  end if;
  return null;
end;
$fn$;

create trigger leads_activity after insert or update on public.leads
  for each row execute function public.leads_activity_trigger();

create or replace function public.quotes_activity_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if tg_op = 'INSERT' then
    perform public.log_lead_activity(
      new.lead_id,
      case when new.version > 1 then 'Teklif revize edildi' else 'Teklif oluşturuldu' end
      || ' (' || new.quote_number || '): ₺'
      || to_char(new.total_amount, 'FM999G999G999D99'));
  elsif new.status is distinct from old.status then
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

create trigger quotes_activity after insert or update on public.quotes
  for each row execute function public.quotes_activity_trigger();

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
      'Opsiyon oluşturuldu: ' || to_char(new.event_date, 'DD.MM.YYYY')
      || ', ' || v_until || ' tarihine kadar.');
  elsif new.status is distinct from old.status then
    perform public.log_lead_activity(new.lead_id, case new.status
      when 'suresi_doldu'  then 'Opsiyon süresi sona erdi.'
      when 'donusturuldu'  then 'Opsiyon rezervasyona dönüştürüldü.'
      when 'iptal'         then 'Opsiyon iptal edildi.'
      else 'Opsiyon yeniden aktif edildi.' end);
  elsif new.expires_at is distinct from old.expires_at then
    perform public.log_lead_activity(
      new.lead_id, 'Opsiyon uzatıldı: ' || v_until || ' tarihine kadar.');
  end if;
  return null;
end;
$fn$;

create trigger venue_holds_activity after insert or update on public.venue_holds
  for each row execute function public.venue_holds_activity_trigger();

-- =============================================================================
-- RPC · Teklif kaydetme (numara tahsisi + kalemler tek transaction'da)
-- =============================================================================

create or replace function public.save_quote(
  p_lead_id         uuid,
  p_venue_id        uuid,
  p_package_id      uuid,
  p_guest_count     integer,
  p_package_amount  numeric,
  p_discount_amount numeric,
  p_valid_until     date,
  p_notes           text,
  p_items           jsonb default '[]'::jsonb
)
returns public.quotes
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_business uuid := public.current_business_id();
  v_year     integer := extract(year from (now() at time zone 'Europe/Istanbul'))::int;
  v_seq      integer;
  v_number   text;
  v_version  integer;
  v_row      public.quotes;
begin
  if v_business is null or not public.can_see_finance() then
    raise exception 'Teklif oluşturmak için finansal yetki gerekir.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Talep gerçekten bu işletmenin mi? RLS'i security definer atladığı için
  -- tenant kontrolü burada elle yapılıyor.
  if not exists (
    select 1 from public.leads
     where id = p_lead_id and business_id = v_business
  ) then
    raise exception 'Talep bulunamadı.' using errcode = 'no_data_found';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
    from public.quotes where lead_id = p_lead_id;

  -- Numara tahsisi tek ifadede, satır kilidiyle: eşzamanlı iki teklif aynı
  -- numarayı alamaz ve sıra atlamaz.
  insert into public.quote_counters (business_id, year, last_no)
  values (v_business, v_year, 1)
  on conflict (business_id, year)
    do update set last_no = public.quote_counters.last_no + 1
  returning last_no into v_seq;

  v_number := 'TKL-' || v_year::text || '-' || lpad(v_seq::text, 6, '0');

  insert into public.quotes (
    business_id, lead_id, quote_number, version, venue_id, package_id,
    guest_count, package_amount, discount_amount, valid_until, notes, created_by
  ) values (
    v_business, p_lead_id, v_number, v_version, p_venue_id, p_package_id,
    p_guest_count, coalesce(p_package_amount, 0), coalesce(p_discount_amount, 0),
    p_valid_until, nullif(btrim(p_notes), ''), auth.uid()
  )
  returning * into v_row;

  insert into public.quote_items (business_id, quote_id, name, amount, sort_order)
  select v_business, v_row.id, btrim(item ->> 'name'),
         (item ->> 'amount')::numeric, (ordinality - 1)::int
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as t(item, ordinality)
   where length(btrim(coalesce(item ->> 'name', ''))) > 0;

  -- extras_amount trigger ile güncellendi; güncel satırı geri oku.
  select * into v_row from public.quotes where id = v_row.id;

  -- Teklif verilen talep hattın bir sonraki adımına geçer; kazanılmış veya
  -- kaybedilmiş bir talebin durumu geri alınmaz.
  update public.leads
     set status = 'teklif_verildi', last_contact_at = now()
   where id = p_lead_id
     and status in ('yeni', 'gorusuluyor');

  return v_row;
end;
$fn$;

-- quote_items değiştikçe teklifin ek hizmet toplamı güncel kalsın.
create or replace function public.sync_quote_extras()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_quote uuid := coalesce(new.quote_id, old.quote_id);
begin
  update public.quotes q
     set extras_amount = coalesce(
       (select sum(amount) from public.quote_items where quote_id = v_quote), 0)
   where q.id = v_quote;
  return null;
end;
$fn$;

create trigger quote_items_sync_extras
  after insert or update or delete on public.quote_items
  for each row execute function public.sync_quote_extras();

-- Geçerlilik tarihi geçen teklifleri kapatır. İstemciye güvenilmez; bu
-- fonksiyon teklif listeleri okunmadan önce sunucu tarafında çağrılıyor.
create or replace function public.expire_quotes()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_count integer;
begin
  update public.quotes
     set status = 'suresi_doldu'
   where status in ('taslak', 'gonderildi')
     and valid_until is not null
     and valid_until < (now() at time zone 'Europe/Istanbul')::date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$fn$;

-- =============================================================================
-- RPC · Talebi rezervasyona dönüştürme
--
-- Bilinçli olarak security invoker: rezervasyon, fiyat ve tahsilat yazımı
-- kullanıcının kendi yetkileriyle, mevcut RLS ve save_reservation() akışıyla
-- yapılır. Paralel bir rezervasyon oluşturma yolu açılmıyor.
-- =============================================================================

create or replace function public.convert_lead_to_reservation(
  p_lead_id         uuid,
  p_quote_id        uuid,
  p_venue_id        uuid,
  p_package_id      uuid,
  p_event_date      date,
  p_start_time      time,
  p_end_time        time,
  p_guest_count     integer,
  p_gross_amount    numeric,
  p_discount_amount numeric,
  p_deposit_amount  numeric,
  p_due_date        date,
  p_notes           text
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  v_lead        public.leads;
  v_reservation uuid;
  v_deposit     numeric := coalesce(p_deposit_amount, 0);
begin
  select * into v_lead from public.leads where id = p_lead_id;
  if not found then
    raise exception 'Talep bulunamadı.' using errcode = 'no_data_found';
  end if;

  -- Aynı talep ikinci kez dönüştürülemez: tahsilatın iki kez yazılmasının
  -- önündeki asıl engel bu kontrol ve leads.reservation_id üzerindeki unique.
  if v_lead.reservation_id is not null then
    raise exception 'Bu talep zaten bir rezervasyona dönüştürülmüş.'
      using errcode = 'unique_violation';
  end if;

  -- Talebin kendi opsiyonu dönüşümü engellemesin; kapatılıyor, silinmiyor.
  update public.venue_holds
     set status = 'donusturuldu'
   where lead_id = p_lead_id and status = 'aktif';

  v_reservation := public.save_reservation(
    null, v_lead.customer_id, p_venue_id, p_package_id,
    v_lead.organization_type, 'kesinlesti'::public.reservation_status,
    p_event_date, p_start_time, p_end_time, p_guest_count,
    p_notes, p_gross_amount, p_discount_amount, p_due_date, null
  );

  -- Kapora yalnızca burada, yalnızca bir kez. Teklif ya da talep aşamasında
  -- hiçbir tahsilat kaydı oluşmaz.
  if v_deposit > 0 then
    if not public.can_see_finance() then
      raise exception 'Kapora girmek için finansal yetki gerekir.'
        using errcode = 'insufficient_privilege';
    end if;
    insert into public.payments (
      reservation_id, customer_id, amount, payment_date, category, method, description
    ) values (
      v_reservation, v_lead.customer_id, round(v_deposit, 2),
      (now() at time zone 'Europe/Istanbul')::date, 'kapora', 'nakit',
      'Talepten dönüşümde alınan kapora'
    );
  end if;

  update public.venue_holds
     set reservation_id = v_reservation
   where lead_id = p_lead_id and status = 'donusturuldu';

  if p_quote_id is not null then
    update public.quotes
       set status = 'kabul', decided_at = now()
     where id = p_quote_id and lead_id = p_lead_id;
    -- Kabul edilen dışındaki bekleyen teklifler kapanır.
    update public.quotes
       set status = 'reddedildi', decided_at = now()
     where lead_id = p_lead_id and id <> p_quote_id
       and status in ('taslak', 'gonderildi');
  end if;

  update public.leads
     set status = 'kazanildi',
         reservation_id = v_reservation,
         converted_at = now(),
         last_contact_at = now(),
         venue_id = p_venue_id,
         package_id = p_package_id,
         event_date = p_event_date,
         guest_count = p_guest_count
   where id = p_lead_id;

  return v_reservation;
end;
$fn$;

-- =============================================================================
-- RPC · Salon müsaitliği
--
-- Tek çağrıda hem seçilen salonun durumu hem de aynı gün müsait alternatif
-- salonlar dönüyor. Ayrı bir müsaitlik sistemi kurulmuyor: kaynak yine
-- reservations tablosu ve aktif opsiyonlar.
-- =============================================================================

create or replace function public.venue_availability(
  p_event_date date,
  p_start_time time,
  p_end_time   time
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
    -- Kesin rezervasyonlar
    select r.venue_id as vid, 'rezervasyon'::text as kind, c.full_name as label,
           r.start_time as s, r.end_time as e, null::timestamptz as until, 1 as rank
      from public.reservations r
      join public.customers c on c.id = r.customer_id
     where r.event_date between p_event_date - 1 and p_event_date + 1
       and r.status <> 'iptal_edildi'
       and tsrange(r.starts_at, r.ends_at, '[)') && v_range
    union all
    -- Aktif opsiyonlar (süresi dolmuş olanlar müsaitliği etkilemez)
    select h.venue_id, 'opsiyon', c.full_name,
           h.start_time, h.end_time, h.expires_at, 2
      from public.venue_holds h
      join public.leads l on l.id = h.lead_id
      join public.customers c on c.id = l.customer_id
     where h.event_date between p_event_date - 1 and p_event_date + 1
       and h.status = 'aktif'
       and h.expires_at > now()
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

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.leads           enable row level security;
alter table public.lead_activities enable row level security;
alter table public.quotes          enable row level security;
alter table public.quote_items     enable row level security;
alter table public.quote_counters  enable row level security;
alter table public.venue_holds     enable row level security;

alter table public.leads           force row level security;
alter table public.lead_activities force row level security;
alter table public.quotes          force row level security;
alter table public.quote_items     force row level security;
alter table public.quote_counters  force row level security;
alter table public.venue_holds     force row level security;

-- --- leads: işletmenin tüm kullanıcıları satış hattını görür ----------------

create policy leads_select on public.leads
  for select to authenticated
  using (business_id = public.current_business_id());
create policy leads_insert on public.leads
  for insert to authenticated
  with check (business_id = public.current_business_id());
create policy leads_update on public.leads
  for update to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- Talep silinmez; kaybedildi olarak işaretlenir (dönüşüm oranı verisi kalsın).
revoke delete on public.leads from authenticated;

-- --- lead_activities: geçmiş yazılır, değiştirilmez -------------------------

create policy lead_activities_select on public.lead_activities
  for select to authenticated
  using (business_id = public.current_business_id());
create policy lead_activities_insert on public.lead_activities
  for insert to authenticated
  with check (business_id = public.current_business_id() and not is_system);

revoke update, delete on public.lead_activities from authenticated;

-- --- quotes: tutar içerdiği için finans yetkisi kapısının arkasında ---------

create policy quotes_select on public.quotes
  for select to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance());
create policy quotes_update on public.quotes
  for update to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance())
  with check (business_id = public.current_business_id() and public.can_see_finance());

create policy quote_items_select on public.quote_items
  for select to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance());

-- Teklif yalnızca save_quote() ile oluşur (numara tahsisi orada). Revizyon
-- yeni sürüm demek; eski teklif hiçbir yoldan silinmez veya kalemleri değişmez.
revoke insert, delete on public.quotes from authenticated;
revoke insert, update, delete on public.quote_items from authenticated;
revoke all on public.quote_counters from authenticated;

-- --- venue_holds ------------------------------------------------------------

create policy venue_holds_select on public.venue_holds
  for select to authenticated
  using (business_id = public.current_business_id());
create policy venue_holds_insert on public.venue_holds
  for insert to authenticated
  with check (business_id = public.current_business_id());
create policy venue_holds_update on public.venue_holds
  for update to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- Süresi dolan opsiyon geçmişten silinmez.
revoke delete on public.venue_holds from authenticated;

-- =============================================================================
-- Yetkiler
-- =============================================================================

-- Tablo yetkileri: RLS'in üzerine yazmaz, yalnızca hangi fiillerin mümkün
-- olduğunu belirler. Yukarıdaki revoke'lar bunları daraltıyor.
grant select, insert, update on public.leads to authenticated;
grant select, insert on public.lead_activities to authenticated;
grant select, update on public.quotes to authenticated;
grant select on public.quote_items to authenticated;
grant select, insert, update on public.venue_holds to authenticated;

grant execute on function public.expire_venue_holds(uuid) to authenticated;
grant execute on function public.expire_quotes() to authenticated;
grant execute on function public.venue_availability(date, time, time) to authenticated;
grant execute on function public.save_quote(
  uuid, uuid, uuid, integer, numeric, numeric, date, text, jsonb
) to authenticated;
grant execute on function public.convert_lead_to_reservation(
  uuid, uuid, uuid, uuid, date, time, time, integer, numeric, numeric, numeric, date, text
) to authenticated;

revoke execute on function public.log_lead_activity(uuid, text) from public;
