-- =============================================================================
-- DavetPro · 0023 · Pazarlama izni
--
-- E-posta doğrulaması adresin gerçek olduğunu kanıtlar; ticari ileti göndermek
-- için AYRI ve açık rıza gerekiyor (İYS / ticari elektronik ileti mevzuatı).
-- Deneme sürümü başlatmak rıza sayılmaz.
--
-- Boolean yerine zaman damgası: rızanın ne zaman alındığı kanıt olarak
-- gerekiyor. NULL = izin yok.
--
-- Rıza kayıt formunda alınıyor ama profil o anda oluşmuyor: e-posta
-- doğrulaması açıkken kullanıcı önce bağlantıya tıklıyor, profil ondan sonra
-- açılıyor. Bu yüzden değer signUp sırasında auth.users meta verisine yazılıyor
-- ve profil oluşurken trigger onu buraya taşıyor. Davet edilen personelde
-- meta veri olmadığı için NULL kalıyor — doğrusu da bu, onlar rıza vermedi.
-- =============================================================================

alter table public.profiles
  add column if not exists marketing_consent_at timestamptz;

comment on column public.profiles.marketing_consent_at is
  'Ticari ileti için açık rızanın alındığı an. NULL ise izin yok.';

create or replace function public.profiles_capture_marketing_consent()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.marketing_consent_at is null
     and coalesce(
       (select (u.raw_user_meta_data ->> 'marketing_consent')::boolean
          from auth.users u where u.id = new.id),
       false)
  then
    new.marketing_consent_at := now();
  end if;
  return new;
end;
$fn$;

drop trigger if exists profiles_marketing_consent on public.profiles;
create trigger profiles_marketing_consent
  before insert on public.profiles
  for each row execute function public.profiles_capture_marketing_consent();
