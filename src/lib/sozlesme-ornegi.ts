/**
 * Herkese açık sözleşme örneği sayfaları için şablon metinleri.
 *
 * KAYNAK: public.default_contract_body() — yeni işletmeye kurulan metnin
 * BİREBİR kopyası. Sayfa "DavetPro bu metni sizin için dolduruyor" diyor;
 * metin üründekinden farklı olursa o söz yalan olur. tests/seo.test.mts
 * en son migration'daki fonksiyon gövdesiyle karşılaştırıyor; şablon
 * değişirse test kırılır ve burası da güncellenir.
 */

export const SOZLESME_SABLONU = {
  salon: "# ORGANİZASYON HİZMET SÖZLEŞMESİ\n\n## 1. TARAFLAR\nİşbu sözleşme, bir tarafta {{business_name}} (\"İŞLETME\") ile diğer tarafta\n{{customer_name}} (\"MÜŞTERİ\") arasında aşağıdaki şartlarda düzenlenmiştir.\n\n## 2. SÖZLEŞMENİN KONUSU\nSözleşmenin konusu, MÜŞTERİ'nin {{event_date}} tarihinde {{venue_name}} adlı\nmekânda düzenleyeceği {{event_type}} organizasyonu için İŞLETME tarafından\nsunulacak hizmetlerin kapsamı ile tarafların hak ve yükümlülükleridir.\n\n## 3. ORGANİZASYON TARİHİ VE KULLANIM SÜRESİ\nOrganizasyon {{event_date}} tarihinde {{start_time}} - {{end_time}} saatleri\narasında gerçekleştirilecektir. Mekân, belirtilen saat aralığı için tahsis\nedilmiştir. Sürenin aşılması hâlinde ek ücret talep edilebilir.\n\n## 4. HİZMET KAPSAMI\nTahmini davetli sayısı {{guest_count}} kişidir. Seçilen paket: {{package_name}}.\nPakete dahil hizmetler: {{included_services}}\nVarsa özel talepler ve notlar: {{notes}}\n\n## 5. TOPLAM HİZMET BEDELİ\nAnlaşılan toplam bedel {{total_price}} olup, uygulanan indirim {{discount_amount}},\nnet sözleşme bedeli {{net_price}} tutarındadır.\n\n## 6. KAPORA VE ÖDEME KOŞULLARI\nİşbu sözleşmenin imzalandığı tarih itibarıyla tahsil edilen tutar\n{{paid_amount}}'dir. Kapora, rezervasyonun kesinleşmesi amacıyla alınmıştır.\n\n## 7. KALAN ÖDEME\nKalan bakiye {{remaining_amount}} tutarındadır ve {{due_date}} tarihine kadar\nödenecektir. Ödeme yapılmaması hâlinde İŞLETME rezervasyonu iptal etme hakkını\nsaklı tutar.\n\n## 8. REZERVASYON İPTALİ\nMÜŞTERİ'nin organizasyonu iptal etmesi hâlinde uygulanacak iptal koşulları\ntaraflarca ayrıca kararlaştırılır. İptal hâlinde kapora iadesine ilişkin\nşartlar bu maddede açıkça belirtilmelidir.\n\n## 9. TARİH DEĞİŞİKLİĞİ\nTarih değişikliği talepleri, İŞLETME'nin takvim uygunluğuna bağlıdır ve\nyazılı olarak bildirilmelidir.\n\n## 10. İŞLETMENİN YÜKÜMLÜLÜKLERİ\nİŞLETME, sözleşmede belirtilen mekânı ve hizmetleri kararlaştırılan tarih ve\nsaatte, hizmet standartlarına uygun şekilde sunmakla yükümlüdür.\n\n## 11. MÜŞTERİNİN YÜKÜMLÜLÜKLERİ\nMÜŞTERİ, ödeme planına uymak, davetlilerinin mekân kurallarına uymasını\nsağlamak ve organizasyona ilişkin bilgileri zamanında bildirmekle yükümlüdür.\n\n## 12. MÜCBİR SEBEPLER\nTarafların kontrolü dışında gelişen ve ifayı imkânsız kılan durumlarda\n(doğal afet, salgın, resmî yasaklama vb.) taraflar sorumlu tutulamaz.\n\n## 13. ORGANİZASYON SIRASINDA OLUŞABİLECEK ZARARLAR\nOrganizasyon süresince MÜŞTERİ veya davetlileri tarafından mekâna verilecek\nzararlardan MÜŞTERİ sorumludur.\n\n## 14. EK HİZMETLER\nSözleşme kapsamı dışında talep edilecek ek hizmetler ayrıca ücretlendirilir ve\nyazılı olarak mutabık kalınır.\n\n## 15. UYUŞMAZLIK VE YETKİLİ MERCİLER\nİşbu sözleşmeden doğabilecek uyuşmazlıklarda yetkili merciler taraflarca\nbelirlenir.\n\n## 16. YÜRÜRLÜK\nİşbu sözleşme {{contract_date}} tarihinde, {{contract_number}} numarası ile\niki nüsha olarak düzenlenmiş ve taraflarca imzalanarak yürürlüğe girmiştir.\n",
  fotografci: "# FOTOĞRAF VE VİDEO HİZMET SÖZLEŞMESİ\n\n## 1. TARAFLAR\nİşbu sözleşme, bir tarafta {{business_name}} (\"HİZMET SAĞLAYICI\") ile diğer\ntarafta {{customer_name}} (\"MÜŞTERİ\") arasında aşağıdaki şartlarda\ndüzenlenmiştir.\n\n## 2. SÖZLEŞMENİN KONUSU\nSözleşmenin konusu, MÜŞTERİ'nin {{event_date}} tarihinde gerçekleştireceği\n{{event_type}} çekiminde HİZMET SAĞLAYICI tarafından sunulacak fotoğraf\nve video çekim hizmetlerinin kapsamı ile tarafların hak ve yükümlülükleridir.\n\n## 3. ÇEKİM TARİHİ VE SÜRESİ\nÇekim {{event_date}} tarihinde {{start_time}} - {{end_time}} saatleri arasında\nyapılacaktır. Sürenin aşılması hâlinde ek ücret talep edilebilir. Çekim yeri ve\nbuluşma saati taraflarca önceden yazılı olarak teyit edilir.\n\n## 4. HİZMET KAPSAMI\nSeçilen paket: {{package_name}}. Pakete dahil hizmetler: {{included_services}}.\nAyrıca ücretlendirilen ek hizmetler: {{extra_services}}.\nÖzel talepler aşağıdaki notlarda belirtilmiştir:\n{{notes}}\n\n## 5. TESLİM SÜRESİ VE BİÇİMİ\nSeçilmiş ve düzenlenmiş kareler ile varsa video kurgusu, taraflarca\nkararlaştırılan süre içinde dijital ortamda teslim edilir. Albüm, baskı ve\nbenzeri fiziksel ürünlerin teslim süresi baskı sürecine bağlı olarak ayrıca\nbildirilir. Teslim süresi bu maddede açıkça yazılmalıdır.\n\n## 6. TOPLAM HİZMET BEDELİ\nAnlaşılan toplam bedel {{total_price}} olup, uygulanan indirim\n{{discount_amount}}, net sözleşme bedeli {{net_price}} tutarındadır.\n\n## 7. KAPORA VE ÖDEME KOŞULLARI\nİşbu sözleşmenin imzalandığı tarih itibarıyla tahsil edilen tutar\n{{paid_amount}}'dir. Kapora, tarihin HİZMET SAĞLAYICI adına bloke edilmesi\namacıyla alınmıştır.\n\n## 8. KALAN ÖDEME\nKalan bakiye {{remaining_amount}} tutarındadır ve {{due_date}} tarihine kadar\nödenecektir. Kalan ödeme tamamlanmadan nihai teslim yapılmayabilir.\n\n## 9. TELİF VE KULLANIM HAKLARI\nÇekilen görsellerin eser sahipliği HİZMET SAĞLAYICI'ya aittir. MÜŞTERİ,\nteslim edilen görselleri kişisel amaçlarla sınırsız olarak kullanabilir;\nticari kullanım ayrıca yazılı izne tabidir. HİZMET SAĞLAYICI'nın görselleri\nportfolyo ve tanıtım amacıyla kullanabilmesi MÜŞTERİ'nin onayına bağlıdır ve\nbu onay aşağıda ayrıca işaretlenir.\n\n## 10. İPTAL KOŞULLARI\nMÜŞTERİ'nin çekimi iptal etmesi hâlinde uygulanacak koşullar taraflarca ayrıca\nkararlaştırılır. İptal hâlinde kapora iadesine ilişkin şartlar bu maddede\naçıkça belirtilmelidir.\n\n## 11. TARİH DEĞİŞİKLİĞİ\nTarih değişikliği talepleri HİZMET SAĞLAYICI'nın takvim uygunluğuna bağlıdır ve\nyazılı olarak bildirilmelidir.\n\n## 12. HİZMET SAĞLAYICININ YÜKÜMLÜLÜKLERİ\nHİZMET SAĞLAYICI, kararlaştırılan tarih ve saatte çekim yerinde hazır bulunmak,\nmesleki standartlara uygun hizmet vermek ve teslim süresine uymakla yükümlüdür.\nTeknik arıza ihtimaline karşı yedek ekipman bulundurulur.\n\n## 13. MÜŞTERİNİN YÜKÜMLÜLÜKLERİ\nMÜŞTERİ, ödeme koşullarına uymak, çekim yeri ve programı hakkında bilgileri\nzamanında bildirmek ve çekim için gerekli izinlerin alınmasını sağlamakla\nyükümlüdür.\n\n## 14. MÜCBİR SEBEPLER\nTarafların kontrolü dışında gelişen ve ifayı imkânsız kılan durumlarda\n(hastalık, doğal afet, salgın, resmî yasaklama vb.) taraflar sorumlu tutulamaz.\nBu hâlde alternatif tarih veya yerine ekip görevlendirme seçenekleri görüşülür.\n\n## 15. YEDEKLEME VE SAKLAMA\nHam kayıtlar teslimden sonra belirli bir süre saklanır; saklama süresi bu\nmaddede belirtilir. Süre sonunda silinmesinden HİZMET SAĞLAYICI sorumlu\ntutulamaz.\n\n## 16. UYUŞMAZLIK VE YETKİLİ MERCİLER\nİşbu sözleşmeden doğabilecek uyuşmazlıklarda yetkili merciler taraflarca\nbelirlenir.\n\n## 17. YÜRÜRLÜK\nİşbu sözleşme {{contract_date}} tarihinde, {{contract_number}} numarası ile\niki nüsha olarak düzenlenmiş ve taraflarca imzalanarak yürürlüğe girmiştir.\n",
} as const;

/** {{alan}} yer tutucularının okunur karşılıkları. */
export const ALAN_ETIKETLERI: Record<string, string> = {
  business_name: "İşletme adı",
  customer_name: "Müşteri adı soyadı",
  event_date: "Organizasyon tarihi",
  event_type: "Organizasyon türü",
  venue_name: "Salon adı",
  start_time: "Başlangıç saati",
  end_time: "Bitiş saati",
  guest_count: "Davetli sayısı",
  package_name: "Paket adı",
  included_services: "Pakete dahil hizmetler",
  extra_services: "Ek hizmetler",
  notes: "Özel talepler",
  total_price: "Toplam bedel",
  discount_amount: "İndirim",
  net_price: "Net bedel",
  paid_amount: "Alınan kapora",
  remaining_amount: "Kalan tutar",
  due_date: "Kalan ödeme tarihi",
  contract_date: "Sözleşme tarihi",
  contract_number: "Sözleşme no",
};

/** Fotoğrafçı metninde etkinlik "çekim". */
export const FOTOGRAF_ETIKETLERI: Record<string, string> = {
  ...ALAN_ETIKETLERI,
  event_date: "Çekim tarihi",
  event_type: "Çekim türü",
};

export type Parca = { tur: "metin"; metin: string } | { tur: "alan"; ad: string; etiket: string };
export type Madde = { baslik: string; paragraf: Parca[] };

/**
 * Şablonu sayfada gösterilecek parçalara ayırır: "# başlık", "## madde" ve
 * yer tutucular. Satır sonları paragraf içinde boşluğa dönüşüyor — metin
 * SQL'de 80 sütunda kırılmış, sayfada akması gerekiyor.
 */
export function sablonuAyristir(
  metin: string,
  etiketler: Record<string, string> = ALAN_ETIKETLERI,
): { baslik: string; maddeler: Madde[] } {
  const satirlar = metin.trim().split("\n");
  const baslik = (satirlar.shift() ?? "").replace(/^#\s*/, "");
  const maddeler: Madde[] = [];
  let tampon: string[] = [];
  let mevcut: string | null = null;

  const bitir = () => {
    if (mevcut === null) return;
    maddeler.push({ baslik: mevcut, paragraf: parcala(tampon.join(" ").replace(/\s+/g, " ").trim(), etiketler) });
    tampon = [];
  };

  for (const satir of satirlar) {
    if (satir.startsWith("## ")) {
      bitir();
      mevcut = satir.slice(3).trim();
    } else if (satir.trim()) {
      tampon.push(satir.trim());
    }
  }
  bitir();
  return { baslik, maddeler };
}

function parcala(metin: string, etiketler: Record<string, string>): Parca[] {
  const out: Parca[] = [];
  let son = 0;
  for (const m of metin.matchAll(/\{\{(\w+)\}\}/g)) {
    if (m.index > son) out.push({ tur: "metin", metin: metin.slice(son, m.index) });
    out.push({ tur: "alan", ad: m[1], etiket: etiketler[m[1]] ?? m[1] });
    son = m.index + m[0].length;
  }
  if (son < metin.length) out.push({ tur: "metin", metin: metin.slice(son) });
  return out;
}
