-- =============================================================================
-- DavetPro · 0001 · Extensions, enums, çekirdek tablolar
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- --- Enums -------------------------------------------------------------------

create type public.user_role as enum ('owner', 'manager', 'staff');

create type public.reservation_status as enum (
  'on_gorusme',
  'opsiyonlu',
  'kesinlesti',
  'tamamlandi',
  'iptal_edildi'
);

create type public.organization_type as enum (
  'dugun',
  'nisan',
  'kina',
  'soz',
  'sunnet',
  'davet',
  'kurumsal',
  'diger'
);

create type public.payment_method as enum (
  'nakit',
  'kredi_karti',
  'havale_eft',
  'diger'
);

create type public.income_category as enum (
  'kapora',
  'ara_odeme',
  'son_odeme',
  'ek_hizmet',
  'diger'
);

-- --- İşletmeler (tenant) -----------------------------------------------------

create table public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 2 and 120),
  phone       text,
  city        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- --- Kullanıcı profilleri (auth.users <-> businesses köprüsü) ----------------

create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  business_id       uuid not null references public.businesses (id) on delete cascade,
  full_name         text not null check (length(btrim(full_name)) between 2 and 120),
  role              public.user_role not null default 'staff',
  -- 'staff' rolü için finans verilerine erişim anahtarı.
  -- owner/manager her zaman görür (can_see_finance() fonksiyonuna bak).
  can_view_finance  boolean not null default false,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index profiles_business_id_idx on public.profiles (business_id);

-- --- Salonlar ----------------------------------------------------------------

create table public.venues (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  name         text not null check (length(btrim(name)) between 1 and 120),
  capacity     integer check (capacity is null or capacity > 0),
  description  text,
  -- Takvim/rozet renklendirmesi için sabit renk (hex).
  color        text not null default '#6366f1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, business_id),
  unique (business_id, name)
);

create index venues_business_id_idx on public.venues (business_id);

-- --- Paketler ----------------------------------------------------------------

create table public.packages (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses (id) on delete cascade,
  name              text not null check (length(btrim(name)) between 1 and 120),
  description       text,
  base_price        numeric(12, 2) not null default 0 check (base_price >= 0),
  guest_capacity    integer check (guest_capacity is null or guest_capacity > 0),
  included_services text[] not null default '{}',
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, business_id),
  unique (business_id, name)
);

create index packages_business_id_idx on public.packages (business_id);

-- --- Müşteriler --------------------------------------------------------------

create table public.customers (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  full_name    text not null check (length(btrim(full_name)) between 2 and 160),
  phone        text not null check (length(btrim(phone)) between 7 and 20),
  phone2       text,
  email        text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, business_id)
);

create index customers_business_id_idx on public.customers (business_id);
create index customers_phone_idx on public.customers (business_id, phone);
-- Ad ve telefona göre hızlı arama (trigram olmadan, prefix + ILIKE için yeterli)
create index customers_name_idx on public.customers (business_id, full_name);

-- --- Rezervasyonlar (operasyonel kısım) --------------------------------------
-- DİKKAT: Finansal alanlar bilerek reservation_pricing tablosunda tutulur.
-- Böylece "finans göremeyen personel" kısıtı frontend'e değil RLS'e dayanır.

create table public.reservations (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses (id) on delete cascade,
  venue_id           uuid not null,
  customer_id        uuid not null,
  package_id         uuid,
  organization_type  public.organization_type not null default 'dugun',
  status             public.reservation_status not null default 'on_gorusme',
  event_date         date not null,
  start_time         time not null,
  end_time           time not null,
  guest_count        integer check (guest_count is null or guest_count > 0),
  notes              text,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- Gece yarısını aşan organizasyonlar (ör. 20:00 - 02:00) doğru hesaplansın.
  starts_at timestamp generated always as (event_date + start_time) stored,
  ends_at   timestamp generated always as (
    (event_date + end_time)
    + (case when end_time <= start_time then interval '1 day' else interval '0 day' end)
  ) stored,

  unique (id, business_id),

  -- Tenant sınırını aşan ilişki kurulamaz (composite FK).
  foreign key (venue_id, business_id)
    references public.venues (id, business_id) on delete restrict,
  foreign key (customer_id, business_id)
    references public.customers (id, business_id) on delete restrict,
  -- Kolon listesi şart: aksi halde SET NULL, business_id'yi de NULL'a çekmeye
  -- çalışır ve NOT NULL kısıtını ihlal eder (PostgreSQL 15+ söz dizimi).
  foreign key (package_id, business_id)
    references public.packages (id, business_id) on delete set null (package_id),

  -- Aynı salonda çakışan rezervasyon veritabanı seviyesinde engellenir.
  constraint reservations_no_overlap exclude using gist (
    venue_id with =,
    tsrange(
      (event_date + start_time),
      (event_date + end_time)
        + (case when end_time <= start_time then interval '1 day' else interval '0 day' end),
      '[)'
    ) with &&
  ) where (status <> 'iptal_edildi')
);

create index reservations_business_date_idx on public.reservations (business_id, event_date);
create index reservations_venue_date_idx on public.reservations (venue_id, event_date);
create index reservations_customer_idx on public.reservations (customer_id);
create index reservations_status_idx on public.reservations (business_id, status);

-- --- Rezervasyon fiyatlandırması (finans kısmı, ayrı RLS) --------------------

create table public.reservation_pricing (
  reservation_id   uuid primary key references public.reservations (id) on delete cascade,
  business_id      uuid not null references public.businesses (id) on delete cascade,
  gross_amount     numeric(12, 2) not null default 0 check (gross_amount >= 0),
  discount_amount  numeric(12, 2) not null default 0 check (discount_amount >= 0),
  net_amount       numeric(12, 2) generated always as (gross_amount - discount_amount) stored,
  -- Kalan ödemenin beklendiği tarih (yaklaşan ödemeler listesi için).
  due_date         date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint pricing_discount_lte_gross check (discount_amount <= gross_amount),
  unique (reservation_id, business_id),
  foreign key (reservation_id, business_id)
    references public.reservations (id, business_id) on delete cascade
);

create index reservation_pricing_business_idx on public.reservation_pricing (business_id);
create index reservation_pricing_due_date_idx on public.reservation_pricing (business_id, due_date);

-- --- Tahsilatlar / Gelirler --------------------------------------------------
-- Kayıtlar değiştirilemez (immutable): silme yok, düzeltme "iptal + yeni kayıt".

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses (id) on delete cascade,
  reservation_id  uuid,
  customer_id     uuid,
  amount          numeric(12, 2) not null check (amount > 0),
  payment_date    date not null default current_date,
  method          public.payment_method not null default 'nakit',
  category        public.income_category not null default 'ara_odeme',
  description     text,
  voided_at       timestamptz,
  void_reason     text,
  voided_by       uuid references public.profiles (id) on delete set null,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint payments_void_reason_required
    check (voided_at is null or length(btrim(coalesce(void_reason, ''))) > 0),
  foreign key (reservation_id, business_id)
    references public.reservations (id, business_id) on delete restrict,
  foreign key (customer_id, business_id)
    references public.customers (id, business_id) on delete restrict
);

create index payments_business_date_idx on public.payments (business_id, payment_date);
create index payments_reservation_idx on public.payments (reservation_id) where voided_at is null;
create index payments_customer_idx on public.payments (customer_id) where voided_at is null;

-- --- Gider kategorileri ------------------------------------------------------
-- Varsayılanlar işletme kurulurken kopyalanır; işletme kendi kategorisini ekler.

create table public.expense_categories (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  name         text not null check (length(btrim(name)) between 1 and 80),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, business_id),
  unique (business_id, name)
);

create index expense_categories_business_idx on public.expense_categories (business_id);

-- --- Giderler ----------------------------------------------------------------

create table public.expenses (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses (id) on delete cascade,
  category_id     uuid not null,
  reservation_id  uuid,
  amount          numeric(12, 2) not null check (amount > 0),
  expense_date    date not null default current_date,
  method          public.payment_method not null default 'nakit',
  description     text,
  vendor          text,
  voided_at       timestamptz,
  void_reason     text,
  voided_by       uuid references public.profiles (id) on delete set null,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint expenses_void_reason_required
    check (voided_at is null or length(btrim(coalesce(void_reason, ''))) > 0),
  foreign key (category_id, business_id)
    references public.expense_categories (id, business_id) on delete restrict,
  foreign key (reservation_id, business_id)
    references public.reservations (id, business_id) on delete restrict
);

create index expenses_business_date_idx on public.expenses (business_id, expense_date);
create index expenses_reservation_idx on public.expenses (reservation_id) where voided_at is null;
create index expenses_category_idx on public.expenses (category_id);
