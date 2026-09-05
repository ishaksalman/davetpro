"use client";

import { useEffect, useRef } from "react";

/**
 * Görünür alana girince 0'dan hedefe sayan rakam.
 *
 * Sunucu çıktısı doğrudan hedef değeri basar: JavaScript kapalıyken de doğru
 * sayı görünür, arama motoru "0" indekslemez. Animasyon React durumu yerine
 * doğrudan DOM'a yazılarak sürülüyor — her karede yeniden render etmenin
 * anlamı yok, sadece bir metin düğümü değişiyor.
 */
export function CountUp({
  to,
  suffix = "",
  prefix = "",
  decimals = 0,
  duration = 1400,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const format = (n: number) =>
      prefix +
      n.toLocaleString("tr-TR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) +
      suffix;

    // Zaten ekrandaysa animasyona hiç girme; hedef değer olduğu gibi kalsın.
    if (node.getBoundingClientRect().top < window.innerHeight) return;

    node.textContent = format(0);

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          // easeOutCubic — sona doğru yavaşlasın.
          node.textContent = format(to * (1 - Math.pow(1 - t, 3)));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [to, duration, decimals, prefix, suffix]);

  return (
    <span ref={ref} className="tabular">
      {prefix}
      {to.toLocaleString("tr-TR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
