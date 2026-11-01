-- Hesap silme (mağaza gereksinimi: uygulama içinden hesap oluşturulabiliyorsa uygulama içinden silinebilmeli).
--
-- delete_my_account(): oturumdaki kullanıcının hesabını kalıcı siler.
--   * Yönetici / personel: yalnızca kendi hesabı silinir; işletme ve kayıtlar kalır
--     (kayıtlardaki "oluşturan" alanları boşalır: FK'ler zaten SET NULL).
--   * İşletme sahibi, işletmede BAŞKA kullanıcı varken silemez: önce o kullanıcılar kaldırılmalı.
--     Yanlışlıkla bir ekibin erişimini ve işletme verisini yok etmemek için bilinçli engel.
--   * İşletmenin tek kullanıcısı olan sahip silerse işletme ve TÜM verisi (müşteri, rezervasyon,
--     tahsilat, gider, sözleşme...) kalıcı silinir. Bağımlılıklar RESTRICT olduğu için sıra elle verilir.
--   * Platform yöneticisi hesabı uygulamadan silinemez.
--
-- Geri alınamaz. İşlem tek transaction'dır: ortada hata olursa hiçbir şey silinmez.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $fn$
declare
  v_uid      uuid := auth.uid();
  v_business uuid;
  v_role     public.user_role;
  v_others   integer;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.' using errcode = 'insufficient_privilege';
  end if;

  if public.is_platform_admin() then
    raise exception 'Platform yöneticisi hesabı uygulamadan silinemez.' using errcode = 'insufficient_privilege';
  end if;

  select business_id, role into v_business, v_role from public.profiles where id = v_uid;

  if v_business is not null and v_role = 'owner' then
    select count(*) into v_others from public.profiles where business_id = v_business and id <> v_uid;
    if v_others > 0 then
      raise exception 'İşletmede başka kullanıcılar var. Hesabınızı silmeden önce onları Ayarlar > Kullanıcılar bölümünden kaldırın.'
        using errcode = 'check_violation';
    end if;

    -- Bağımlılık sırası: önce yapraklar, en son işletme (kalan her şey ON DELETE CASCADE ile gider).
    delete from public.venue_holds   where business_id = v_business;
    delete from public.quote_items   where business_id = v_business;
    delete from public.quotes        where business_id = v_business;
    delete from public.lead_activities where business_id = v_business;
    delete from public.leads         where business_id = v_business;
    delete from public.contracts     where business_id = v_business;
    delete from public.payments      where business_id = v_business;
    delete from public.expenses      where business_id = v_business;
    delete from public.reservations  where business_id = v_business;  -- kalemleri ve fiyat satırlarını da siler
    delete from public.customers     where business_id = v_business;
    delete from public.businesses    where id = v_business;            -- profil, salon, paket, ekip, abonelik...
  end if;

  -- Profil business silinince gitmiş olabilir; auth kaydı en son silinir (profiles.id -> auth.users CASCADE).
  delete from auth.users where id = v_uid;
end
$fn$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
