-- =============================================================================
-- DavetPro · 0049 · Yönetim listesine işletme telefonu
--
-- Abonelikler ekranından müşteriyi aramak / WhatsApp'tan yazmak için.
-- Kaynak `businesses.phone` (Ayarlar › İşletme). Kayıt formu telefon
-- sormadığı için boş olabilir; arayüz o durumda "—" gösteriyor.
--
-- Fonksiyonun geri kalanı 0028 ile birebir aynı.
-- =============================================================================

-- returns table'a kolon eklemek "cannot change return type of existing
-- function" veriyor; önce düşürmek gerekiyor. Düşürme grant'ları da sildiği
-- için dosyanın sonunda yeniden veriliyor.
drop function if exists public.admin_businesses();

create function public.admin_businesses()
returns table (
  business_id       uuid,
  business_name     text,
  city              text,
  business_phone    text,
  owner_email       text,
  owner_name        text,
  created_at        timestamptz,
  trial_ends_at     timestamptz,
  access_until      timestamptz,
  reference_code    text,
  note              text,
  venue_count       integer,
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
    b.phone,
    -- ::text — auth.users.email varchar(255), ilan edilen tip text (bkz. 0027).
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
    (select count(*)::integer from public.venues v
      where v.business_id = b.id and v.is_active),
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
