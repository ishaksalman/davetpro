import { Bell, FilePen, Lock, Smartphone, Users } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";

const TILE =
  "flex h-full flex-col rounded-[22px] border border-mk-line bg-white p-7";

/**
 * "Bizi ayıran ne?" — referans tasarımdaki bento ızgarasının karşılığı.
 * İlk kutu degrade çerçeveyle öne çıkar.
 */
export function Bento() {
  return (
    <section className="bg-mk-tint py-20 lg:py-28">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
        <Reveal className="max-w-[38rem]">
          <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-mk-muted uppercase">
            Farkımız
          </p>
          <h2 className="mk-title mt-4 text-[clamp(1.9rem,3.6vw,2.75rem)] text-mk-ink">
            Genel muhasebe programı değil, salon programı.
          </h2>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-mk-body">
            Kapora, opsiyonlu tarih, kişi başı fiyat, salon kirası… Bu işin kendi
            kavramları var. DavetPro bunların üzerine kuruldu.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {/* Öne çıkan kutu — iki sütun genişliğinde */}
          <Reveal className="lg:col-span-2">
            <div className={cn(TILE, "mk-gradient-ring justify-between gap-8 sm:flex-row")}>
              <div className="max-w-[24rem]">
                <Lock className="size-6 text-mk-ink" strokeWidth={1.6} />
                <h3 className="mk-title mt-5 text-[1.25rem] text-mk-ink">
                  Finansı sadece yetkili görsün
                </h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-mk-body">
                  Fiyat ve tahsilat bilgisi rezervasyondan ayrı tutulur. Karşılama
                  personeli takvimi ve müşteriyi görür, tutarları görmez.
                </p>
              </div>

              {/* Rol matrisi */}
              <div aria-hidden className="shrink-0 rounded-xl bg-mk-tint p-4 sm:min-w-[13rem]">
                {[
                  { role: "Sahip", access: "Tümü", on: true },
                  { role: "Yönetici", access: "Tümü", on: true },
                  { role: "Personel", access: "Finans hariç", on: false },
                ].map((r) => (
                  <div
                    key={r.role}
                    className="flex items-center justify-between gap-6 border-b border-mk-line py-2 last:border-0 last:pb-0 first:pt-0"
                  >
                    <span className="text-[0.8125rem] font-medium text-mk-ink">{r.role}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[0.6875rem] font-medium",
                        r.on
                          ? "bg-[#16e0b4]/15 text-[#0a7d61]"
                          : "bg-white text-mk-muted ring-1 ring-mk-line ring-inset",
                      )}
                    >
                      {r.access}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className={TILE}>
              <Users className="size-6 text-mk-ink" strokeWidth={1.6} />
              <h3 className="mk-title mt-5 text-[1.125rem] text-mk-ink">
                Talepten sözleşmeye
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-mk-body">
                Gelen her talep kayıt altında. Görüşme notu, verilen teklif ve
                sonucu aynı yerde durur.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className={TILE}>
              <FilePen className="size-6 text-mk-ink" strokeWidth={1.6} />
              <h3 className="mk-title mt-5 text-[1.125rem] text-mk-ink">
                Hazır sözleşme çıktısı
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-mk-body">
                Paket, tutar ve ödeme planı yerleşmiş A4 sözleşme. Yazdırın,
                imzalatın.
              </p>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className={TILE}>
              <Bell className="size-6 text-mk-ink" strokeWidth={1.6} />
              <h3 className="mk-title mt-5 text-[1.125rem] text-mk-ink">
                Yaklaşan ödeme uyarısı
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-mk-body">
                Vadesi gelen ara ödemeler panelde bekler; WhatsApp&apos;tan tek
                tıkla hatırlatın.
              </p>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className={TILE}>
              <Smartphone className="size-6 text-mk-ink" strokeWidth={1.6} />
              <h3 className="mk-title mt-5 text-[1.125rem] text-mk-ink">
                Telefondan da çalışır
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-mk-body">
                Salondayken tarih sorgulayın, kapora girin. Kurulum yok, tarayıcı
                yeter.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
