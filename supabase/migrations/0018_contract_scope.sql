-- =============================================================================
-- DavetPro · 0018 · Sözleşmede hizmet kapsamı
--
-- packages.included_services alanı vardı ama sözleşmeye hiç taşınmıyordu:
-- belge yalnızca "Seçilen paket: Gold Menü" diyor, neyin dahil olduğunu
-- söylemiyordu. Hizmet sözleşmesinde kapsam en kritik madde.
--
-- Kapsam artık belgenin "Paket / Hizmet Bilgileri" bölümünde madde madde
-- yazılıyor; bu, şablondan bağımsız çalışıyor. Şablon metninde de
-- kullanılabilsin diye {{included_services}} değişkeni eklendi.
--
-- Yalnızca VARSAYILAN şablon güncelleniyor. Mevcut işletmelerin şablonu kendi
-- metni olduğu için değiştirilmiyor — üzerine yazmak düzenledikleri metni
-- kaybettirirdi. Yapısal bölüm hizmetleri onlarda da gösteriyor.
-- =============================================================================

create or replace function public.default_contract_body()
returns text
language sql
immutable
as $fn$
select $tpl$# ORGANİZASYON HİZMET SÖZLEŞMESİ

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
$tpl$;
$fn$;
