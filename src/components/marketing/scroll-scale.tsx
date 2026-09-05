"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
/** easeOutCubic — büyüme sona doğru yavaşlasın. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Kaydırdıkça büyüyen blok.
 *
 * Referans tasarımdaki hero davranışı: ürün görseli küçük başlar (0.72) ve
 * ekranda yukarı çıktıkça gerçek boyutuna oturur. Kapsayıcının genişliği hep
 * son ölçüdedir, yalnızca `scale` değişir — bu yüzden yatay taşma olmaz ve
 * her karede yeniden yerleşim (layout) hesaplanmaz.
 *
 * Kaydırma dinleyicisi `passive`, güncelleme `requestAnimationFrame` ile
 * eşleniyor; böylece kaydırma akıcı kalıyor.
 */
export function ScrollScale({
  children,
  className,
  /** Başlangıç ölçeği. 1'e kadar büyür. */
  from = 0.72,
  /** Büyümenin başladığı nokta — bloğun üstü ekranın bu oranındayken. */
  startAt = 0.8,
  /** Büyümenin tamamlandığı nokta. */
  endAt = 0.15,
}: {
  children: React.ReactNode;
  className?: string;
  from?: number;
  startAt?: number;
  endAt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Hareket azaltma tercihi: efekt yok, blok doğrudan tam boyutta.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.style.transform = "none";
      return;
    }

    let queued = false;

    const update = () => {
      queued = false;
      // Görünmeyen sekmede innerHeight 0 olabiliyor; sıfıra bölüp
      // transform'a NaN yazmayalım.
      const viewport = window.innerHeight;
      if (viewport <= 0) return;

      const top = node.getBoundingClientRect().top;
      // Pencere, bloğun açılıştaki konumundan başlar: hero'nun ekranı
      // katlamanın hemen altında durduğu için `viewport` referans alınsaydı
      // sayfa daha açılırken yarı büyümüş görünürdü.
      const start = viewport * startAt;
      const end = viewport * endAt;
      const progress = clamp((start - top) / (start - end), 0, 1);
      node.style.transform = `scale(${from + (1 - from) * easeOut(progress)})`;
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [from, startAt, endAt]);

  return (
    <div
      ref={ref}
      // Sunucu çıktısında da küçük başlasın ki hidrasyonda sıçrama olmasın.
      style={{ transform: `scale(${from})`, willChange: "transform" }}
      // origin-top: küçükken bloğun üst kenarı yerinde kalır, büyüme aşağı
      // doğru olur. Merkez olsaydı küçük hâli katlamanın altına kayardı.
      className={cn("origin-top", className)}
    >
      {children}
    </div>
  );
}
