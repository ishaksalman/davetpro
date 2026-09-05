const VENUES = [
  "Beyaz Köşk Davet",
  "Grand Elit Balo Salonu",
  "Nurbahçe Kır Düğünü",
  "Safir Davet",
  "Kristal Balo",
  "Meridyen Organizasyon",
  "Zeytinlik Bahçe",
  "Altın Vadi Salonu",
];

/**
 * Kullanıcı şeridi. Logolar yerine isimler kayıyor — gerçek müşteri logoları
 * gelene kadar sahte marka çizmek yerine tipografiyle duruyor.
 */
export function TrustStrip() {
  return (
    <section className="border-b border-mk-line bg-white py-10">
      <p className="text-center text-[0.8125rem] font-medium text-mk-muted">
        Türkiye&apos;nin dört bir yanındaki salonlar DavetPro kullanıyor
      </p>

      <div
        className="relative mt-6 overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)",
          WebkitMaskImage:
            "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)",
        }}
      >
        <div className="mk-marquee-track">
          {/* Kesintisiz döngü için liste iki kez basılıyor; ikincisi ekran
              okuyucuya tekrar etmesin diye gizli. */}
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1}
              className="flex shrink-0 items-center gap-14 pr-14"
            >
              {VENUES.map((name) => (
                <li
                  key={name}
                  className="text-[1.0625rem] font-medium tracking-tight whitespace-nowrap text-mk-ink/35"
                >
                  {name}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
