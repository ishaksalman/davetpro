-- =============================================================================
-- DavetPro · 0027 · admin_businesses() e-posta tipi düzeltmesi
--
-- 0026'daki fonksiyon owner_email'i `text` olarak ilan ediyordu ama değeri
-- auth.users.email'den okuyor; Supabase'de o kolonun tipi varchar(255). Dönüş
-- tipi birebir eşleşmek zorunda olduğu için fonksiyon canlıda
-- "structure of query does not match function result type" hatası veriyordu.
--
-- Testlerde görünmemesinin sebebi: supabase-stub.sql auth.users.email'i `text`
-- olarak tanımlıyordu. Taklit gerçeğe uyduruldu ve hata testte de üretildi.
-- =============================================================================

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
    -- ::text — auth.users.email varchar(255), ilan edilen tip text.
    (select u.email::text
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
  -- Süresi en yakında dolan başta.
  order by s.access_until, b.created_at desc;
end;
$fn$;

revoke execute on function public.admin_businesses() from public;
grant execute on function public.admin_businesses() to authenticated;
