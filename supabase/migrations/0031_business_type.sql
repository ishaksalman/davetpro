-- =============================================================================
-- DavetPro · 0031 · İşletme tipi (salon / fotoğrafçı)
--
-- Aynı ürün iki işi de yapabiliyor çünkü çekirdek aynı: takvim, çakışma,
-- müşteri, teklif, sözleşme, tahsilat, gider, kârlılık. Kısıtlı kaynak
-- salonda "salon", fotoğrafçıda "ekip" — ikisi de aynı venues satırı, aynı
-- exclude using gist kısıtı. Bu yüzden ÇAKIŞMA MANTIĞINA HİÇ DOKUNULMUYOR.
--
-- MEVCUT HESAPLAR ETKİLENMİYOR: kolon 'salon' varsayılanıyla geliyor, var
-- olan iki işletme olduğu gibi kalıyor. Kurulumda açılan gider kategorisi ve
-- sözleşme şablonu yalnızca YENİ işletmeleri ilgilendiriyor; mevcutlarınki
-- zaten yazılmış durumda ve onlara dokunulmuyor.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'business_type') then
    create type public.business_type as enum ('salon', 'fotografci');
  end if;
end;
$$;

alter table public.businesses
  add column if not exists business_type public.business_type
    not null default 'salon';

comment on column public.businesses.business_type is
  'İşin cinsi. Kısıtlı kaynağın adı (salon / ekip) ve kurulum verileri buna göre değişir.';

-- --- Varsayılan sözleşme metni -----------------------------------------------
-- Parametre eklendiği için eski imza düşürülüyor. Salon metni 0018'den
-- programla alındı, elle kopyalanmadı.
drop function if exists public.default_contract_body();
drop function if exists public.default_contract_body(public.business_type);

create function public.default_contract_body(
  p_business_type public.business_type default 'salon'
)
returns text
language sql
immutable
as $fn$
select case p_business_type
  when 'fotografci' then $foto$# FOTOĞRAF VE VİDEO HİZMET SÖZLEŞMESİ

## 1. TARAFLAR
İşbu sözleşme, bir tarafta {{business_name}} ("HİZMET SAĞLAYICI") ile diğer
tarafta {{customer_name}} ("MÜŞTERİ") arasında aşağıdaki şartlarda
düzenlenmiştir.

## 2. SÖZLEŞMENİN KONUSU
Sözleşmenin konusu, MÜŞTERİ'nin {{event_date}} tarihinde gerçekleştireceği
{{event_type}} organizasyonunda HİZMET SAĞLAYICI tarafından sunulacak fotoğraf
ve video çekim hizmetlerinin kapsamı ile tarafların hak ve yükümlülükleridir.

## 3. ÇEKİM TARİHİ VE SÜRESİ
Çekim {{event_date}} tarihinde {{start_time}} - {{end_time}} saatleri arasında
yapılacaktır. Sürenin aşılması hâlinde ek ücret talep edilebilir. Çekim yeri ve
buluşma saati taraflarca önceden yazılı olarak teyit edilir.

## 4. HİZMET KAPSAMI
Seçilen paket: {{package_name}}. Pakete dahil hizmetler: {{included_services}}.
Ayrıca ücretlendirilen ek hizmetler: {{extra_services}}.
Özel talepler aşağıdaki notlarda belirtilmiştir:
{{notes}}

## 5. TESLİM SÜRESİ VE BİÇİMİ
Seçilmiş ve düzenlenmiş kareler ile varsa video kurgusu, taraflarca
kararlaştırılan süre içinde dijital ortamda teslim edilir. Albüm, baskı ve
benzeri fiziksel ürünlerin teslim süresi baskı sürecine bağlı olarak ayrıca
bildirilir. Teslim süresi bu maddede açıkça yazılmalıdır.

## 6. TOPLAM HİZMET BEDELİ
Anlaşılan toplam bedel {{total_price}} olup, uygulanan indirim
{{discount_amount}}, net sözleşme bedeli {{net_price}} tutarındadır.

## 7. KAPORA VE ÖDEME KOŞULLARI
İşbu sözleşmenin imzalandığı tarih itibarıyla tahsil edilen tutar
{{paid_amount}}'dir. Kapora, tarihin HİZMET SAĞLAYICI adına bloke edilmesi
amacıyla alınmıştır.

## 8. KALAN ÖDEME
Kalan bakiye {{remaining_amount}} tutarındadır ve {{due_date}} tarihine kadar
ödenecektir. Kalan ödeme tamamlanmadan nihai teslim yapılmayabilir.

## 9. TELİF VE KULLANIM HAKLARI
Çekilen görsellerin eser sahipliği HİZMET SAĞLAYICI'ya aittir. MÜŞTERİ,
teslim edilen görselleri kişisel amaçlarla sınırsız olarak kullanabilir;
ticari kullanım ayrıca yazılı izne tabidir. HİZMET SAĞLAYICI'nın görselleri
portfolyo ve tanıtım amacıyla kullanabilmesi MÜŞTERİ'nin onayına bağlıdır ve
bu onay aşağıda ayrıca işaretlenir.

## 10. İPTAL KOŞULLARI
MÜŞTERİ'nin çekimi iptal etmesi hâlinde uygulanacak koşullar taraflarca ayrıca
kararlaştırılır. İptal hâlinde kapora iadesine ilişkin şartlar bu maddede
açıkça belirtilmelidir.

## 11. TARİH DEĞİŞİKLİĞİ
Tarih değişikliği talepleri HİZMET SAĞLAYICI'nın takvim uygunluğuna bağlıdır ve
yazılı olarak bildirilmelidir.

## 12. HİZMET SAĞLAYICININ YÜKÜMLÜLÜKLERİ
HİZMET SAĞLAYICI, kararlaştırılan tarih ve saatte çekim yerinde hazır bulunmak,
mesleki standartlara uygun hizmet vermek ve teslim süresine uymakla yükümlüdür.
Teknik arıza ihtimaline karşı yedek ekipman bulundurulur.

## 13. MÜŞTERİNİN YÜKÜMLÜLÜKLERİ
MÜŞTERİ, ödeme koşullarına uymak, çekim yeri ve programı hakkında bilgileri
zamanında bildirmek ve çekim için gerekli izinlerin alınmasını sağlamakla
yükümlüdür.

## 14. MÜCBİR SEBEPLER
Tarafların kontrolü dışında gelişen ve ifayı imkânsız kılan durumlarda
(hastalık, doğal afet, salgın, resmî yasaklama vb.) taraflar sorumlu tutulamaz.
Bu hâlde alternatif tarih veya yerine ekip görevlendirme seçenekleri görüşülür.

## 15. YEDEKLEME VE SAKLAMA
Ham kayıtlar teslimden sonra belirli bir süre saklanır; saklama süresi bu
maddede belirtilir. Süre sonunda silinmesinden HİZMET SAĞLAYICI sorumlu
tutulamaz.

## 16. UYUŞMAZLIK VE YETKİLİ MERCİLER
İşbu sözleşmeden doğabilecek uyuşmazlıklarda yetkili merciler taraflarca
belirlenir.

## 17. YÜRÜRLÜK
İşbu sözleşme {{contract_date}} tarihinde, {{contract_number}} numarası ile
iki nüsha olarak düzenlenmiş ve taraflarca imzalanarak yürürlüğe girmiştir.
$foto$
  else $salon$# ORGANİZASYON HİZMET SÖZLEŞMESİ

## 1. TARAFLAR
İşbu sözleşme, bir tarafta {{business_name}} ("İŞLETME") ile diğer tarafta
{{customer_name}} ("MÜŞTERİ") arasında aşağıdaki şartlarda düzenlenmiştir.

## 2. SÖZLEŞMENİN KONUSU
Sözleşmenin konusu, MÜŞTERİ'nin {{event_date}} tarihinde {{venue_name}} adlı
mekânda düzenleyeceği {{event_type}} organizasyonu için İŞLETME tarafından
sunulacak hizmetlerin kapsamı ile tarafların hak ve yükümlülükleridir.

## 3. ORGANİZASYON TARİHİ VE KULLANIM SÜRESİ
Organizasyon {{event_date}} tarihinde {{start_time}} - {{end_time}} saatleri
arasında gerçekleştirilecektir. Mekân, belirtilen saat aralığı için tahsis
edilmiştir. Sürenin aşılması hâlinde ek ücret talep edilebilir.

## 4. HİZMET KAPSAMI
Tahmini davetli sayısı {{guest_count}} kişidir. Seçilen paket: {{package_name}}.
Pakete dahil hizmetler: {{included_services}}
Varsa özel talepler ve notlar: {{notes}}

## 5. TOPLAM HİZMET BEDELİ
Anlaşılan toplam bedel {{total_price}} olup, uygulanan indirim {{discount_amount}},
net sözleşme bedeli {{net_price}} tutarındadır.

## 6. KAPORA VE ÖDEME KOŞULLARI
İşbu sözleşmenin imzalandığı tarih itibarıyla tahsil edilen tutar
{{paid_amount}}'dir. Kapora, rezervasyonun kesinleşmesi amacıyla alınmıştır.

## 7. KALAN ÖDEME
Kalan bakiye {{remaining_amount}} tutarındadır ve {{due_date}} tarihine kadar
ödenecektir. Ödeme yapılmaması hâlinde İŞLETME rezervasyonu iptal etme hakkını
saklı tutar.

## 8. REZERVASYON İPTALİ
MÜŞTERİ'nin organizasyonu iptal etmesi hâlinde uygulanacak iptal koşulları
taraflarca ayrıca kararlaştırılır. İptal hâlinde kapora iadesine ilişkin
şartlar bu maddede açıkça belirtilmelidir.

## 9. TARİH DEĞİŞİKLİĞİ
Tarih değişikliği talepleri, İŞLETME'nin takvim uygunluğuna bağlıdır ve
yazılı olarak bildirilmelidir.

## 10. İŞLETMENİN YÜKÜMLÜLÜKLERİ
İŞLETME, sözleşmede belirtilen mekânı ve hizmetleri kararlaştırılan tarih ve
saatte, hizmet standartlarına uygun şekilde sunmakla yükümlüdür.

## 11. MÜŞTERİNİN YÜKÜMLÜLÜKLERİ
MÜŞTERİ, ödeme planına uymak, davetlilerinin mekân kurallarına uymasını
sağlamak ve organizasyona ilişkin bilgileri zamanında bildirmekle yükümlüdür.

## 12. MÜCBİR SEBEPLER
Tarafların kontrolü dışında gelişen ve ifayı imkânsız kılan durumlarda
(doğal afet, salgın, resmî yasaklama vb.) taraflar sorumlu tutulamaz.

## 13. ORGANİZASYON SIRASINDA OLUŞABİLECEK ZARARLAR
Organizasyon süresince MÜŞTERİ veya davetlileri tarafından mekâna verilecek
zararlardan MÜŞTERİ sorumludur.

## 14. EK HİZMETLER
Sözleşme kapsamı dışında talep edilecek ek hizmetler ayrıca ücretlendirilir ve
yazılı olarak mutabık kalınır.

## 15. UYUŞMAZLIK VE YETKİLİ MERCİLER
İşbu sözleşmeden doğabilecek uyuşmazlıklarda yetkili merciler taraflarca
belirlenir.

## 16. YÜRÜRLÜK
İşbu sözleşme {{contract_date}} tarihinde, {{contract_number}} numarası ile
iki nüsha olarak düzenlenmiş ve taraflarca imzalanarak yürürlüğe girmiştir.
$salon$
end;
$fn$;

revoke execute on function public.default_contract_body(public.business_type) from public;
grant execute on function public.default_contract_body(public.business_type) to authenticated;

-- --- İşletme kurulumu --------------------------------------------------------
-- Yeni parametre arity değiştiriyor; eski imza düşürülmeli.
drop function if exists public.create_business_with_owner(text, text);
drop function if exists public.create_business_with_owner(
  text, text, public.business_type);

create function public.create_business_with_owner(
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

  insert into public.contract_templates (business_id, body)
  values (v_business_id, public.default_contract_body(p_business_type));

  return v_business_id;
end;
$fn$;

grant execute on function public.create_business_with_owner(
  text, text, public.business_type
) to authenticated;
