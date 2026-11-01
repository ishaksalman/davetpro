import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description:
    "DavetPro hangi kişisel verileri neden işler, ne kadar saklar ve haklarınızı nasıl kullanırsınız (KVKK).",
  alternates: { canonical: "/gizlilik" },
};

export default function GizlilikPage() {
  return (
    <LegalPage
      baslik="Gizlilik Politikası"
      ozet="DavetPro, düğün salonu, fotoğrafçı ve organizasyon işletmeleri için rezervasyon, tahsilat ve gelir–gider takibi yapan bir uygulamadır. Bu metin, web sitesi ve mobil uygulama için kişisel verilerinizin 6698 sayılı KVKK kapsamında nasıl işlendiğini anlatır."
      guncelleme="26 Ekim 2026"
      bolumler={[
        {
          baslik: "Kimin verisi, kim sorumlu?",
          icerik: (
            <>
              <p>
                İki ayrı durum var. <strong>Hesap sahibinin</strong> (işletme sahibi veya kullanıcısı) verileri için
                veri sorumlusu, DavetPro hizmetini işleten <strong>İshak Salman</strong>&apos;dır (Yalova). İşletmenizin <strong>müşterilerine ait</strong> kayıtlar
                (ad, telefon, rezervasyon ve ödeme bilgisi) için veri sorumlusu, o kayıtları giren işletmenizdir;
                DavetPro bu verileri yalnızca işletmenizin talimatıyla, hizmeti sunmak için işleyen taraftır.
              </p>
              <p>Veri sorumlusu: İshak Salman · Yalova · İletişim: {CONTACT_EMAIL}</p>
            </>
          ),
        },
        {
          baslik: "Hangi verileri işliyoruz?",
          icerik: (
            <ul>
              <li>Hesap: ad soyad, e-posta adresi, şifre (yalnızca geri döndürülemez özet olarak saklanır), rol ve yetkiler.</li>
              <li>İşletme: işletme adı, türü, adres, telefon, şehir ve sözleşme başlığında kullanılan bilgiler.</li>
              <li>İşletmenizin girdiği kayıtlar: müşteri adı ve telefonu, rezervasyonlar, tahsilat ve giderler, talepler, teklifler, sözleşmeler ve notlar.</li>
              <li>Abonelik: deneme/abonelik durumu, erişim bitiş tarihi ve ödeme eşleştirme için referans kodu. Kart bilgisi istemiyoruz ve saklamıyoruz.</li>
              <li>Teknik veriler: oturum çerezleri ve hizmetin güvenliği için gereken kayıtlar.</li>
              <li>İzin verdiyseniz: ticari ileti tercihi (zorunlu değildir).</li>
            </ul>
          ),
        },
        {
          baslik: "Neden işliyoruz?",
          icerik: (
            <ul>
              <li>Hesabınızı açmak, oturumunuzu yönetmek ve hizmeti sunmak (sözleşmenin ifası).</li>
              <li>Abonelik ve ödeme takibi, destek taleplerini yanıtlamak.</li>
              <li>Güvenliği sağlamak, kötüye kullanımı önlemek ve yasal yükümlülükleri yerine getirmek.</li>
              <li>Yalnızca izninizle, ürün ve kampanya duyuruları göndermek.</li>
            </ul>
          ),
        },
        {
          baslik: "Kimlerle paylaşıyoruz?",
          icerik: (
            <>
              <p>
                Verilerinizi satmayız ve reklam amacıyla üçüncü taraflarla paylaşmayız. Hizmeti çalıştırmak için
                altyapı ve barındırma sağlayıcılarından yararlanırız; bu sağlayıcılar verileri yalnızca bizim
                talimatımızla işler. Yasal bir zorunluluk olduğunda yetkili kurumlara bilgi verilebilir.
              </p>
              <p>
                Altyapı sağlayıcılarımızın sunucuları yurt dışında bulunabilir; bu durumda aktarım KVKK&apos;nın
                yurt dışına aktarım hükümlerine uygun olarak yapılır.
              </p>
            </>
          ),
        },
        {
          baslik: "Ne kadar saklıyoruz?",
          icerik: (
            <p>
              Verileri hesabınız açık olduğu sürece saklarız. Hesabınızı kapatıp silmeniz halinde hesabınız ve
              (işletmenin tek kullanıcısıysanız) işletmenizin tüm kayıtları kalıcı olarak silinir; yedeklerdeki
              kopyalar makul bir süre içinde döngüyle yok olur. Yasal saklama yükümlülüğü olan kayıtlar, süre
              sonuna kadar ayrıca tutulabilir. Deneme veya abonelik süresi bittiğinde verileriniz silinmez, erişim durur.
            </p>
          ),
        },
        {
          baslik: "Hesabınızı ve verilerinizi silme",
          icerik: (
            <p>
              Mobil uygulamada <strong>Hesabım → Hesabı sil</strong> ile hesabınızı kendiniz silebilirsiniz.
              İşletmede başka kullanıcılar varken işletme sahibi hesabı silemez; önce onları kaldırması gerekir.
              Web üzerinden silme veya başka talepleriniz için {CONTACT_EMAIL} adresine yazabilirsiniz.
            </p>
          ),
        },
        {
          baslik: "Haklarınız",
          icerik: (
            <>
              <p>KVKK&apos;nın 11. maddesi uyarınca şunları isteyebilirsiniz:</p>
              <ul>
                <li>Verinizin işlenip işlenmediğini öğrenmek ve bilgi talep etmek,</li>
                <li>İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenmek,</li>
                <li>Eksik veya yanlış işlenmişse düzeltilmesini istemek,</li>
                <li>Kanunda öngörülen şartlarla silinmesini veya yok edilmesini istemek,</li>
                <li>Verilerin aktarıldığı üçüncü kişileri öğrenmek ve bu işlemlerin bildirilmesini istemek,</li>
                <li>Otomatik analiz sonucu aleyhinize bir sonuç çıkarsa itiraz etmek, zarara uğrarsanız tazminat talep etmek.</li>
              </ul>
              <p>Başvurularınızı {CONTACT_EMAIL} adresine iletebilirsiniz; en geç 30 gün içinde yanıtlarız.</p>
            </>
          ),
        },
        {
          baslik: "Güvenlik",
          icerik: (
            <p>
              Verilerinizi yetkisiz erişime karşı korumak için erişim denetimi (işletme bazında veri ayrımı),
              şifreli bağlantı ve rol bazlı yetkilendirme kullanırız. Hiçbir sistem tamamen risksizdir; bir ihlal
              fark edersek ilgili kişileri ve gerekiyorsa Kurum&apos;u mevzuattaki sürelerde bilgilendiririz.
            </p>
          ),
        },
        {
          baslik: "Çocuklar",
          icerik: <p>Hizmet işletmelere yöneliktir ve 18 yaşın altındaki kişilere sunulmaz.</p>,
        },
        {
          baslik: "Değişiklikler",
          icerik: (
            <p>
              Bu metni güncelleyebiliriz. Önemli değişiklikleri uygulama veya e-posta ile duyururuz; güncel sürüm
              her zaman bu sayfadadır.
            </p>
          ),
        },
      ]}
    />
  );
}
