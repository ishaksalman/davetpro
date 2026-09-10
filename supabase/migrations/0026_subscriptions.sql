-- =============================================================================
-- DavetPro · 0026 · Deneme süresi ve abonelik erişimi
--
-- 30 günlük deneme, ardından elle uzatılan erişim. Ödeme havale ile alınıyor ve
-- onay elle yapılıyor; bu yüzden burada ödeme/tahsilat mantığı YOK, yalnızca
-- "bu işletme ne zamana kadar erişebilir" bilgisi var.
--
-- NEDEN AYRI TABLO: businesses üzerindeki UPDATE politikası kolon ayrımı
-- yapmıyor (0003_rls.sql), yani owner/manager kendi işletmesinin her kolonunu
-- değiştirebiliyor. access_until businesses içinde olsaydı bir işletme sahibi
-- kendi tokenıyla PATCH /rest/v1/businesses atıp süresini sonsuza uzatabilirdi.
-- Ayrı tabloda `authenticated` rolüne yalnızca SELECT verildi; UPDATE grant'i
-- ve UPDATE politikası hiç yok.
--
-- NEDEN DURUM KOLONU YOK: durum türetiliyor (talep ve rezervasyon durumlarında
-- olduğu gibi). access_until > trial_ends_at ise abone, değilse deneme;
-- access_until geçmişse erişim yok. Böylece "ödemesi bitmiş ama durumu aktif
-- kalmış" gibi bir kayma mümkün değil.
--
-- business_id doğrudan birincil anahtar: işletme başına tek satır. Projedeki
-- `(id, business_id)` bileşik unique kuralı burada karşılıksız — ayrı bir id
-- kolonu yok, kiracı sınırı birincil anahtarın kendisi.
-- =============================================================================

-- --- Deneme süresi -----------------------------------------------------------
-- Tek yerde dursun: tetikleyici de testler de buradan okuyor.
create or replace function public.trial_days()
returns integer
language sql
immutable
as $$ select 30 $$;

-- --- Platform yöneticisi -----------------------------------------------------
-- Kiracı rolleriyle (owner/manager/staff) ilgisi yok: her işletmenin bir
-- owner'ı var, süre uzatma yetkisi role bağlanırsa herkes kendi süresini
-- uzatır. Bu tablo uygulamayı İŞLETEN tarafı tanımlıyor.
--
-- E-posta ile tutuluyor çünkü kullanıcı kimliği (uuid) ortamlar arasında
-- değişiyor, e-posta değişmiyor. Başkasının bu adresi üstlenmesi mümkün değil:
-- auth.users.email tekil.
create table if not exists public.platform_admins (
  email      text primary key,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
alter table public.platform_admins force row level security;

-- Politika ve grant BİLEREK yok: bu tabloyu hiçbir kiracı okuyamaz.
-- Yalnızca aşağıdaki security definer fonksiyonun içinden görülüyor.

insert into public.platform_admins (email)
values ('ishakslmn@gmail.com')
on conflict (email) do nothing;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from auth.users u
    join public.platform_admins pa on lower(pa.email) = lower(u.email)
    where u.id = auth.uid()
  )
$$;

revoke execute on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

-- --- Abonelik tablosu --------------------------------------------------------

create table if not exists public.subscriptions (
  business_id    uuid primary key references public.businesses (id) on delete cascade,
  -- Kayıt anında + trial_days(); bir daha DEĞİŞMEZ. Denemeyle ödenmiş dönemi
  -- ayırt etmek yalnızca buna bakarak mümkün.
  trial_ends_at  timestamptz not null,
  -- Kilidin tek yetkilisi. Elle uzatılıyor.
  access_until   timestamptz not null,
  -- Havale açıklamasına yazılıyor; gelen ödemeyi işletmeye bağlayan tek şey.
  reference_code text not null unique,
  -- Yönetim ekranından düşülen not ("3 ay havale, 12.09").
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on column public.subscriptions.access_until is
  'Bu ana kadar erişim var. Geçmişse hesap /abonelik sayfasına kilitlenir.';

alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;

-- Kiracı kendi satırını GÖRÜR, değiştiremez.
--
-- Platform yöneticisine burada ayrıcalık YOK, bilerek: yönetim listesi
-- admin_businesses() ile geliyor. Politikaya "or is_platform_admin()" eklenseydi
-- yönetici bu tablodan tüm satırları görürdü ve oturum açılışındaki
-- maybeSingle() okuması ikinci işletme kaydolduğu anda "çok satır" hatası
-- verirdi — yani yöneticinin kendi hesabı bozulurdu.
drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (business_id = public.current_business_id());

-- INSERT/UPDATE/DELETE politikası BİLEREK yok; yazma yalnızca aşağıdaki
-- security definer fonksiyonlarla. Grant de vermiyoruz: PostgREST üzerinden
-- UPDATE denemesi politikaya bile ulaşmadan yetki hatasıyla dönüyor.
grant select on public.subscriptions to authenticated;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- --- Referans kodu -----------------------------------------------------------

create or replace function public.generate_reference_code()
returns text
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  v_code text;
  v_try  integer := 0;
begin
  loop
    -- Karışabilen karakterler (0/O, 1/I) alfabede yok: kod havale
    -- açıklamasına elle yazılıyor ve telefonda okunuyor.
    v_code := 'DP-' || (
      select string_agg(
               substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ',
                      1 + floor(random() * 32)::integer, 1),
               '')
      from generate_series(1, 4)
    );
    exit when not exists (
      select 1 from public.subscriptions where reference_code = v_code
    );
    v_try := v_try + 1;
    if v_try > 50 then
      raise exception 'Referans kodu üretilemedi.';
    end if;
  end loop;
  return v_code;
end;
$fn$;

-- --- Deneme süresi işletme açılırken başlar ----------------------------------
-- create_business_with_owner() içine yazmak yerine tetikleyici: o fonksiyon
-- 0007'de bir kez yeniden yazıldı, gövdesini üçüncü kez kopyalamak gereksiz
-- risk. Tetikleyici ayrıca işletmenin hangi yoldan açıldığından bağımsız
-- çalışıyor.
create or replace function public.businesses_start_trial()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_ends timestamptz := now() + (public.trial_days() || ' days')::interval;
begin
  insert into public.subscriptions
    (business_id, trial_ends_at, access_until, reference_code)
  values
    (new.id, v_ends, v_ends, public.generate_reference_code())
  on conflict (business_id) do nothing;
  return null;
end;
$fn$;

drop trigger if exists businesses_start_trial on public.businesses;
create trigger businesses_start_trial
  after insert on public.businesses
  for each row execute function public.businesses_start_trial();

-- --- Yönetim işlemleri -------------------------------------------------------

create or replace function public.admin_extend_access(
  p_business_id uuid,
  p_days        integer,
  p_note        text default null
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_row public.subscriptions;
begin
  if not public.is_platform_admin() then
    raise exception 'Bu işlem için platform yöneticisi olmak gerekir.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'Gün sayısı 1 ile 3650 arasında olmalı.'
      using errcode = 'check_violation';
  end if;

  -- greatest(): süresi 10 gün önce dolmuş bir hesaba 30 gün eklenince
  -- "access_until + 30" hâlâ geçmişte kalırdı. Süresi dolmuşlarda bugünden,
  -- devam edenlerde mevcut bitişin üstünden sayıyor.
  update public.subscriptions
     set access_until = greatest(access_until, now()) + (p_days || ' days')::interval,
         note         = coalesce(p_note, note)
   where business_id = p_business_id
  returning * into v_row;

  if v_row.business_id is null then
    raise exception 'İşletme bulunamadı.' using errcode = 'no_data_found';
  end if;

  return v_row;
end;
$fn$;

revoke execute on function public.admin_extend_access(uuid, integer, text) from public;
grant execute on function public.admin_extend_access(uuid, integer, text) to authenticated;

-- Yönetim listesi RPC ile: businesses/profiles politikalarını platform
-- yöneticisine açmak, kiracı sorgularının hepsini de etkileyen bir genişletme
-- olurdu. Fonksiyon yetkiyi kendi içinde denetliyor.
create or replace function public.admin_businesses()
returns table (
  business_id       uuid,
  business_name     text,
  city              text,
  owner_email       text,
  owner_name        text,
  created_at        timestamptz,
  trial_ends_at     timestamptz,
  access_until      timestamptz,
  reference_code    text,
  note              text,
  user_count        integer,
  reservation_count integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
begin
  if not public.is_platform_admin() then
    raise exception 'Bu işlem için platform yöneticisi olmak gerekir.'
      using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    b.id,
    b.name,
    b.city,
    (select u.email
       from public.profiles p
       join auth.users u on u.id = p.id
      where p.business_id = b.id and p.role = 'owner'
      order by p.created_at
      limit 1),
    (select p.full_name
       from public.profiles p
      where p.business_id = b.id and p.role = 'owner'
      order by p.created_at
      limit 1),
    b.created_at,
    s.trial_ends_at,
    s.access_until,
    s.reference_code,
    s.note,
    (select count(*)::integer from public.profiles p where p.business_id = b.id),
    (select count(*)::integer from public.reservations r where r.business_id = b.id)
  from public.businesses b
  join public.subscriptions s on s.business_id = b.id
  -- Süresi en yakında dolan başta: yönetim ekranında ilgilenilmesi gereken
  -- hesap listenin tepesinde olsun.
  order by s.access_until, b.created_at desc;
end;
$fn$;

revoke execute on function public.admin_businesses() from public;
grant execute on function public.admin_businesses() to authenticated;

-- --- Mevcut işletmeler -------------------------------------------------------
-- Tek tek: generate_reference_code() tekilliği tabloya bakarak denetliyor,
-- tek INSERT ... SELECT içinde satırlar birbirini görmediği için aynı kod iki
-- kez üretilebilirdi.
do $$
declare
  v_id   uuid;
  v_ends timestamptz := now() + (public.trial_days() || ' days')::interval;
begin
  for v_id in
    select b.id from public.businesses b
    where not exists (
      select 1 from public.subscriptions s where s.business_id = b.id
    )
  loop
    insert into public.subscriptions
      (business_id, trial_ends_at, access_until, reference_code)
    values (v_id, v_ends, v_ends, public.generate_reference_code());
  end loop;
end;
$$;

-- Platform yöneticisinin kendi işletmesi kilitlenmesin. Uygulama tarafında da
-- muaf, bu ikinci katman: süre uzatacağı ekrana ulaşamaz hale gelmesin.
update public.subscriptions s
   set access_until = greatest(s.access_until, now() + interval '10 years')
 where exists (
   select 1
     from public.profiles p
     join auth.users u on u.id = p.id
     join public.platform_admins pa on lower(pa.email) = lower(u.email)
    where p.business_id = s.business_id
 );
