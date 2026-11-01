import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { CONTACT_EMAIL } from "@/lib/contact";
import { TRIAL_DAYS } from "@/lib/subscription";

export const metadata: Metadata = {
  title: "Kullanım Koşulları",
  description: "DavetPro hizmetini kullanma koşulları: hesap, deneme ve abonelik, sorumluluklar ve sona erme.",
  alternates: { canonical: "/kullanim-kosullari" },
};

export default function KullanimKosullariPage() {
  return (
    <LegalPage
      baslik="Kullanım Koşulları"
      ozet="DavetPro web sitesini ve mobil uygulamasını kullanarak aşağıdaki koşulları kabul etmiş olursunuz. Kabul etmiyorsanız hizmeti kullanmayın."
      guncelleme="26 Ekim 2026"
      bolumler={[
        {
          baslik: "Hizmet",
          icerik: (
            <p>
              DavetPro; düğün salonu, fotoğrafçı ve organizasyon işletmelerinin rezervasyon, takvim, tahsilat,
              gelir–gider ve müşteri kayıtlarını yönetmesini sağlayan bir yazılım hizmetidir. Özellikler zamanla
              değişebilir; hizmeti iyileştirme ve güncelleme hakkımız saklıdır.
            </p>
          ),
        },
        {
          baslik: "Hesap ve güvenlik",
          icerik: (
            <ul>
              <li>Doğru ve güncel bilgi vermekle yükümlüsünüz.</li>
              <li>Şifrenizin gizliliği ve hesabınızdan yapılan işlemler sizin sorumluluğunuzdadır; yetkisiz kullanımı fark ettiğinizde hemen bize bildirin.</li>
              <li>İşletmenize eklediğiniz kullanıcıların yetkilerini siz belirler ve onların işlemlerinden siz sorumlusunuz.</li>
            </ul>
          ),
        },
        {
          baslik: "Deneme ve abonelik",
          icerik: (
            <ul>
              <li>Yeni hesaplara {TRIAL_DAYS} günlük ücretsiz deneme tanınır; kart bilgisi istenmez ve deneme sonunda otomatik tahsilat yapılmaz.</li>
              <li>Abonelik süreleri ve bedelleri fiyatlar sayfasında yazılıdır. Ödeme havale/EFT ile yapılır, otomatik yenileme yoktur.</li>
              <li>Süre dolduğunda erişim durur; kayıtlarınız silinmez. Ödemeniz onaylandığında erişiminiz devam eder.</li>
            </ul>
          ),
        },
        {
          baslik: "Verileriniz",
          icerik: (
            <p>
              İşletmenize ait kayıtların (müşteriler, rezervasyonlar, ödemeler vb.) sahibi sizsiniz. Bu kayıtları
              girerken müşterilerinizin kişisel verilerini mevzuata uygun işlemek ve gerekli aydınlatmayı yapmak
              sizin sorumluluğunuzdadır. Verilerin nasıl işlendiği Gizlilik Politikası&apos;nda anlatılmıştır.
            </p>
          ),
        },
        {
          baslik: "Kabul edilebilir kullanım",
          icerik: (
            <ul>
              <li>Hizmeti hukuka aykırı amaçlarla, başkalarının haklarını ihlal edecek şekilde veya sistemin işleyişini bozacak biçimde kullanamazsınız.</li>
              <li>Hizmete yetkisiz erişmeye, otomatik araçlarla aşırı yük bindirmeye ya da güvenlik önlemlerini aşmaya çalışamazsınız.</li>
            </ul>
          ),
        },
        {
          baslik: "Hizmet sürekliliği ve sorumluluk sınırı",
          icerik: (
            <>
              <p>
                Hizmeti kesintisiz ve hatasız sunmaya çalışırız; bakım, arıza veya mücbir sebeplerle
                kesintiler olabilir. Önemli kayıtlarınızı (ör. sözleşmeleri) ayrıca saklamanızı öneririz.
              </p>
              <p>
                Yasaların izin verdiği ölçüde, dolaylı zararlardan, kâr kaybından ve hizmet dışı nedenlerden
                doğan zararlardan sorumlu değiliz. Doğrudan zarar sorumluluğumuz, olayın gerçekleştiği dönemde
                ödediğiniz abonelik bedeliyle sınırlıdır. Tüketici mevzuatından doğan haklarınız saklıdır.
              </p>
            </>
          ),
        },
        {
          baslik: "Sona erme",
          icerik: (
            <p>
              Hesabınızı istediğiniz zaman kapatabilirsiniz (mobil uygulamada Hesabım → Hesabı sil). Bu koşulları
              ihlal etmeniz halinde hesabınızı askıya alabilir veya kapatabiliriz. Sona erme, o ana kadar doğmuş
              hak ve yükümlülükleri etkilemez.
            </p>
          ),
        },
        {
          baslik: "Değişiklikler ve uygulanacak hukuk",
          icerik: (
            <p>
              Koşulları güncelleyebiliriz; önemli değişiklikleri duyururuz. Güncelleme sonrası hizmeti kullanmaya
              devam etmeniz yeni koşulları kabul ettiğiniz anlamına gelir. Bu koşullara Türk hukuku uygulanır;
              uyuşmazlıklarda Türkiye mahkemeleri ve icra daireleri yetkilidir.
            </p>
          ),
        },
        {
          baslik: "İletişim",
          icerik: <p>Hizmet sağlayıcı: İshak Salman (DavetPro), Yalova. Sorularınız için: {CONTACT_EMAIL}</p>,
        },
      ]}
    />
  );
}
