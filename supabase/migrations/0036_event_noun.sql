-- =============================================================================
-- DavetPro · 0036 · Mesajlarda işin cinsine göre kelime
--
-- "organizasyon" salon dili; fotoğrafçı için doğrusu "çekim". Kelime
-- mesajın içinde sabitti, bu yüzden tetikleyici işin cinsini soruyor.
--
-- Sorgu yalnızca HATA YOLUNDA çalışıyor: çakışma bulunduktan sonra, mesaj
-- kurulurken. Başarılı kayıtlarda fazladan sorgu yok.
-- =============================================================================

create or replace function public.event_noun(p_business_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when (select business_type from public.businesses where id = p_business_id) = 'fotografci'
      then 'çekim'
    else 'organizasyon'
  end
$$;

revoke execute on function public.event_noun(uuid) from public;
grant execute on function public.event_noun(uuid) to authenticated;

create or replace function public.reservation_hold_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_gap      integer := public.min_gap_minutes();
  v_range    tsrange;
  v_conflict record;
  v_isim     text;
begin
  if new.status = 'iptal_edildi' then
    return new;
  end if;

  v_range := public.blocking_range(new.event_date, new.start_time, new.end_time, v_gap);

  perform pg_advisory_xact_lock(hashtextextended(new.venue_id::text, 0));
  perform public.expire_venue_holds(new.venue_id);

  select r.start_time as s, r.end_time as e, c.full_name as label
    into v_conflict
    from public.reservations r
    join public.customers c on c.id = r.customer_id
   where r.venue_id = new.venue_id
     and r.status <> 'iptal_edildi'
     and r.id is distinct from new.id
     and public.blocking_range(r.event_date, r.start_time, r.end_time, v_gap) && v_range
   limit 1;

  if found then
    v_isim := public.event_noun(new.business_id);
    raise exception
      '% adına % - % arası bir % var. İki % arasında en az % dakika bırakılmalı.',
      v_conflict.label, to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'),
      v_isim, v_isim, v_gap
      using errcode = 'exclusion_violation';
  end if;

  select h.expires_at, c.full_name
    into v_conflict
    from public.venue_holds h
    join public.leads l on l.id = h.lead_id
    join public.customers c on c.id = l.customer_id
   where h.venue_id = new.venue_id
     and h.status = 'aktif'
     and h.reservation_id is distinct from new.id
     and public.blocking_range(h.event_date, h.start_time, h.end_time, v_gap) && v_range
   limit 1;

  if found then
    raise exception 'Seçilen saat aralığı % adına opsiyonlu (bitiş: %).',
      v_conflict.full_name,
      to_char(v_conflict.expires_at at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI')
      using errcode = 'exclusion_violation';
  end if;

  return new;
end;
$fn$;

create or replace function public.venue_hold_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_gap      integer := public.min_gap_minutes();
  v_range    tsrange;
  v_conflict record;
begin
  if new.status <> 'aktif' then
    return new;
  end if;

  if tg_op = 'INSERT' and new.expires_at <= now() then
    raise exception 'Opsiyon bitiş zamanı gelecekte olmalı.'
      using errcode = 'check_violation';
  end if;

  v_range := public.blocking_range(new.event_date, new.start_time, new.end_time, v_gap);

  perform pg_advisory_xact_lock(hashtextextended(new.venue_id::text, 0));
  perform public.expire_venue_holds(new.venue_id);

  select r.start_time as s, r.end_time as e, c.full_name as label
    into v_conflict
    from public.reservations r
    join public.customers c on c.id = r.customer_id
   where r.venue_id = new.venue_id
     and r.status <> 'iptal_edildi'
     and public.blocking_range(r.event_date, r.start_time, r.end_time, v_gap) && v_range
   limit 1;

  if found then
    raise exception
      '% adına % - % arası kesin rezervasyon var. İki % arasında en az % dakika bırakılmalı.',
      v_conflict.label, to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'),
      public.event_noun(new.business_id), v_gap
      using errcode = 'exclusion_violation';
  end if;

  select h.start_time as s, h.end_time as e, c.full_name as label
    into v_conflict
    from public.venue_holds h
    join public.leads l on l.id = h.lead_id
    join public.customers c on c.id = l.customer_id
   where h.venue_id = new.venue_id
     and h.status = 'aktif'
     and h.id is distinct from new.id
     and public.blocking_range(h.event_date, h.start_time, h.end_time, v_gap) && v_range
   limit 1;

  if found then
    raise exception
      '% adına % - % arası aktif bir opsiyon var. İki % arasında en az % dakika bırakılmalı.',
      v_conflict.label, to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'),
      public.event_noun(new.business_id), v_gap
      using errcode = 'exclusion_violation';
  end if;

  return new;
end;
$fn$;

create or replace function public.lead_conflict_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_gap       integer := public.min_gap_minutes();
  v_range     tsrange;
  v_whole_day boolean := new.start_time is null or new.end_time is null;
  v_hint      text;
  v_conflict  record;
begin
  if new.venue_id is null or new.event_date is null then
    return new;
  end if;

  if new.status in ('kazanildi', 'kaybedildi') then
    return new;
  end if;

  v_range := public.blocking_range(new.event_date, new.start_time, new.end_time, v_gap);

  v_hint := case
    when v_whole_day then
      ' Belirli bir saat aralığı için uygunluğu görmek istiyorsanız başlangıç ve bitiş saatini girin.'
    else
      format(' İki organizasyon arasında en az %s dakika bırakılmalı.', v_gap)
  end;

  perform public.expire_venue_holds(new.venue_id);

  select 'rezervasyon'::text as kind, c.full_name as label,
         r.start_time as s, r.end_time as e, null::timestamptz as until
    into v_conflict
    from public.reservations r
    join public.customers c on c.id = r.customer_id
   where r.venue_id = new.venue_id
     and r.status <> 'iptal_edildi'
     and r.id is distinct from new.reservation_id
     and public.blocking_range(r.event_date, r.start_time, r.end_time, v_gap) && v_range
   limit 1;

  if not found then
    select 'opsiyon'::text, c.full_name, h.start_time, h.end_time, h.expires_at
      into v_conflict
      from public.venue_holds h
      join public.leads l on l.id = h.lead_id
      join public.customers c on c.id = l.customer_id
     where h.venue_id = new.venue_id
       and h.status = 'aktif'
       and h.expires_at > now()
       and h.lead_id is distinct from new.id
       and public.blocking_range(h.event_date, h.start_time, h.end_time, v_gap) && v_range
     limit 1;
  end if;

  if not found then
    return new;
  end if;

  if v_conflict.kind = 'opsiyon' then
    raise exception '% tarihinde % adına opsiyon var (% - %, opsiyon bitişi %).%',
      to_char(new.event_date, 'DD.MM.YYYY'), v_conflict.label,
      to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'),
      to_char(v_conflict.until at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI'),
      v_hint
      using errcode = 'exclusion_violation';
  else
    raise exception '% tarihinde % adına % var (% - %).%',
      to_char(new.event_date, 'DD.MM.YYYY'), v_conflict.label,
      public.event_noun(new.business_id),
      to_char(v_conflict.s, 'HH24:MI'), to_char(v_conflict.e, 'HH24:MI'), v_hint
      using errcode = 'exclusion_violation';
  end if;
end;
$fn$;


-- -----------------------------------------------------------------------------
-- Fotoğrafçı sözleşmesindeki "organizasyonunda" → "çekiminde".
-- 0031 düzenlenmiyor (uygulanmış olabilir); doğrusu burada yeniden kuruluyor.
-- -----------------------------------------------------------------------------

create or replace function public.default_contract_body(
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
{{event_type}} çekiminde HİZMET SAĞLAYICI tarafından sunulacak fotoğraf
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

-- Kayıtlı şablonu DOKUNULMAMIŞ olanlarda güncelle. İşletme metni
-- değiştirdiyse eşleşme tutmaz ve kendi metni korunur.
update public.contract_templates
   set body = $yeni$# FOTOĞRAF VE VİDEO HİZMET SÖZLEŞMESİ

## 1. TARAFLAR
İşbu sözleşme, bir tarafta {{business_name}} ("HİZMET SAĞLAYICI") ile diğer
tarafta {{customer_name}} ("MÜŞTERİ") arasında aşağıdaki şartlarda
düzenlenmiştir.

## 2. SÖZLEŞMENİN KONUSU
Sözleşmenin konusu, MÜŞTERİ'nin {{event_date}} tarihinde gerçekleştireceği
{{event_type}} çekiminde HİZMET SAĞLAYICI tarafından sunulacak fotoğraf
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
$yeni$
 where body = $eski$# FOTOĞRAF VE VİDEO HİZMET SÖZLEŞMESİ

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
$eski$;
