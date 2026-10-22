-- 0044 — İşletmenin yetkili kişisi kayıttaki addan doluyor
--
-- Kayıtta girilen ad yalnızca profile yazılıyordu; businesses.authorized_person
-- boş kalıyordu. Sözleşmenin imza bölümü bu alanı bastığı için her yeni
-- işletmede "Yetkili kişi eksik" uyarısı çıkıyordu.
--
-- 1) create_business_with_owner adı işletmeye de yazıyor (gövdenin geri
--    kalanı 0042 ile aynı).
-- 2) Yetkili kişisi boş olan mevcut işletmelere sahibin adı yazılıyor.
--    Elle girilmiş değerlere dokunulmuyor.

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

  -- Yetkili kişi kayıttaki addan: sözleşmenin imza bölümü bu alanı basıyor.
  -- Boş bırakılınca her yeni işletmede sözleşme uyarısı çıkıyordu; kullanıcı
  -- aynı adı bir kez daha yazmak zorunda kalıyordu.
  insert into public.businesses (name, business_type, authorized_person)
  values (btrim(p_business_name), p_business_type, nullif(btrim(p_full_name), ''))
  returning id into v_business_id;

  insert into public.profiles (id, business_id, full_name, role, can_view_finance)
  values (v_uid, v_business_id, btrim(p_full_name), 'owner', true);

  -- Gider kalemleri işin cinsine göre: salon mutfak ve mekân gideri yazıyor,
  -- fotoğrafçı ekipman ve baskı.
  foreach v_category in array (
    case p_business_type
      when 'organizasyon' then array[
        'Mekân Kirası', 'Personel', 'Catering / Yemek', 'İçecek', 'Dekorasyon',
        'Müzik / DJ', 'Fotoğraf / Video', 'Ses ve Işık', 'Ulaşım / Nakliye',
        'Ekipman Kirası', 'Reklam', 'Vergi', 'Diğer'
      ]
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
  -- Organizasyon firmasının işlerinin çoğu kendi mekânında değil: düğün
  -- salonunda, otelde, müşterinin bahçesinde. Hepsi bu satıra düşüyor ve
  -- burada çakışma yasağı işlemiyor — aynı anda iki ayrı adreste iş olabilir.
  -- Kendi salonu varsa onu ayrıca tanımlıyor ve orada kural işliyor.
  if p_business_type = 'organizasyon' then
    insert into public.venues (business_id, name, description, allows_overlap)
    values (v_business_id, 'Dış mekân',
            'Kendi mekânınız dışındaki işler: otel, bahçe, müşteri adresi.', true);
  end if;

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

update public.businesses b
set authorized_person = o.full_name
from (
  select distinct on (business_id) business_id, btrim(full_name) as full_name
  from public.profiles
  where role = 'owner' and btrim(coalesce(full_name, '')) <> ''
  order by business_id, created_at
) o
where o.business_id = b.id
  and btrim(coalesce(b.authorized_person, '')) = '';
