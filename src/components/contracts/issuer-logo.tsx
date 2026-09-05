"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Belgenin antet alanı: logo varsa logo, yoksa işletme adı.
 *
 * Yükleme hatası ayrıca ele alınıyor — yalnızca "logo_url dolu mu" bakmak
 * yetmiyordu: adres yanlış yazıldığında, kaynak silindiğinde veya sunucu
 * dış bağlantıya izin vermediğinde antet tamamen boş kalıyordu. Sözleşmenin
 * kimin düzenlediğini göstermemesi, logosuz olmasından kötü.
 */
export function IssuerLogo({
  src,
  businessName,
}: {
  src: string | null;
  businessName: string;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // onError tek başına yetmiyor: görsel sunucudan gelen HTML ayrıştırılırken,
  // React hydrate olmadan önce başarısız olabiliyor ve o an dinleyici henüz
  // bağlı değil. Mount sonrası durumu doğrudan okuyoruz — yüklenmiş ama
  // genişliği sıfırsa çizilememiş demektir.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (!src || failed) {
    return <p className="contract-issuer-name">{businessName}</p>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      // Görsel çizilemezse tarayıcı alt metni gösterir: ikinci güvence.
      alt={businessName}
      className="contract-logo"
      onError={() => setFailed(true)}
    />
  );
}
