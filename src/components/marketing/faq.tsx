import { Reveal } from "@/components/marketing/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { sssVerisi, type Soru } from "@/lib/seo";

/**
 * Sık sorulanlar bölümü + FAQPage yapısal verisi.
 *
 * Veri ile görünen metin AYNI diziden üretiliyor: Google sayfada görünmeyen
 * soru-cevabı işaretlemeyi kural ihlali sayıyor; iki ayrı yerde tutulsa biri
 * güncellenip diğeri unutulurdu.
 *
 * <details> kullanılıyor: kapalıyken de metin HTML'de duruyor (tarayıcı ve
 * robot okuyor), JavaScript gerektirmiyor.
 */
export function Faq({
  baslik = "Sık sorulanlar",
  aciklama,
  sorular,
  id = "sss",
  tinted = false,
}: {
  baslik?: string;
  aciklama?: string;
  sorular: Soru[];
  id?: string;
  tinted?: boolean;
}) {
  return (
    <section id={id} className={tinted ? "bg-mk-tint py-20 lg:py-24" : "bg-white py-20 lg:py-24"}>
      <JsonLd data={sssVerisi(sorular)} />
      <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
        <Reveal className="mx-auto max-w-[42rem] text-center">
          <h2 className="mk-title text-[clamp(1.75rem,3vw,2.25rem)] text-mk-ink">{baslik}</h2>
          {aciklama && (
            <p className="mt-4 text-[1.0625rem] leading-relaxed text-mk-body">{aciklama}</p>
          )}
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3">
          {sorular.map((s) => (
            <details
              key={s.soru}
              className="group rounded-[18px] border border-mk-line bg-white px-6 py-5 open:shadow-[0_18px_40px_-30px_rgba(11,18,32,0.35)]"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[1rem] font-semibold tracking-tight text-mk-ink [&::-webkit-details-marker]:hidden">
                <h3 className="text-[1rem] font-semibold">{s.soru}</h3>
                <span
                  aria-hidden
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-mk-soft text-mk-muted transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-mk-body">{s.cevap}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
