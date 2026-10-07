-- =============================================================================
-- DavetPro · 0042 · Eş zamanlı rezervasyon kapasitesi
--
-- Organizasyon firması aynı saatte birden fazla iş yürütebiliyor. Ama bu
-- "sınırsız" demek değil: firmanın aynı anda kaç işe yetişebileceği belli.
-- Ayarlardan sınırsız ya da bir sayı seçiliyor.
--
-- NEDEN EXCLUDE KISITI DEĞİL: exclude "hiç çakışmasın" diyebiliyor, "en fazla
-- N tane çakışsın" diyemiyor. Sayma gerektiren kural tetikleyiciye düşüyor.
--
-- NEDEN DANIŞMA KİLİDİ: saymak ile yazmak arasında geçen anda ikinci bir
-- istek aynı sayıyı okuyup ikisi birden geçebilir — rezervasyon yazılımında
-- en klasik açık bu. İşletme başına danışma kilidi, o işletmenin eşzamanlı
-- yazmalarını sıraya sokuyor; sayım ile yazma arasına kimse giremiyor.
-- Kilit işlem sonunda kendiliğinden bırakılıyor (xact).
--
-- Kilit İŞLETME BAŞINA: farklı kiracılar birbirini beklemiyor.
-- =============================================================================

alter table public.businesses
  add column if not exists concurrent_capacity integer
    check (concurrent_capacity is null or concurrent_capacity between 1 and 999);

comment on column public.businesses.concurrent_capacity is
  'Aynı anda yürütülebilecek rezervasyon sayısı. null = sınırsız. '
  'Yalnızca organizasyon firmalarında kullanılıyor.';

-- --- Kapasite koruması --------------------------------------------------------

create or replace function public.reservation_capacity_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_kapasite integer;
  v_aralik   tsrange;
  v_mevcut   integer;
begin
  select b.concurrent_capacity into v_kapasite
    from public.businesses b
   where b.id = new.business_id;

  -- Sınırsız: kural yok. Salon ve fotoğrafçıda kolon hep null olduğu için
  -- onlar bu tetikleyiciden hiç etkilenmiyor.
  if v_kapasite is null then
    return new;
  end if;

  if new.status = 'iptal_edildi' then
    return new;
  end if;

  -- Sayımdan ÖNCE kilit: iki eşzamanlı istek aynı boşluğu görmesin.
  perform pg_advisory_xact_lock(hashtext(new.business_id::text));

  v_aralik := public.event_range(new.event_date, new.start_time, new.end_time);

  select count(*) into v_mevcut
    from public.reservations r
   where r.business_id = new.business_id
     and r.status <> 'iptal_edildi'
     and (new.id is null or r.id <> new.id)
     and r.event_date between new.event_date - 1 and new.event_date + 1
     and public.event_range(r.event_date, r.start_time, r.end_time) && v_aralik;

  if v_mevcut >= v_kapasite then
    raise exception
      'Bu saatte zaten % iş var ve eş zamanlı kapasiteniz %. Kapasiteyi '
      'Ayarlar''dan artırabilir veya saati değiştirebilirsiniz.',
      v_mevcut, v_kapasite
      using errcode = 'check_violation';
  end if;

  return new;
end;
$fn$;

drop trigger if exists reservations_capacity_guard on public.reservations;
create trigger reservations_capacity_guard
  before insert or update of event_date, start_time, end_time, status
  on public.reservations
  for each row execute function public.reservation_capacity_guard();

-- --- Kurulum: organizasyon firması ---------------------------------------------
--
-- Sözleşme şablonu salon metnini kullanıyor: başlığı zaten "ORGANİZASYON
-- HİZMET SÖZLEŞMESİ" ve maddeleri birebir uyuyor. Ayrı bir hukuki metin
-- yazmak istenmedi; gerekirse işletme Ayarlar'dan kendi metnini giriyor.

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
