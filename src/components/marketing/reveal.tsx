"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Görünür alana girince beliren blok.
 *
 * Varsayılan durum *görünür*: gizleme yalnızca istemcide, blok ekranın altında
 * kaldığı anlaşıldığında uygulanır. Sunucu çıktısı bu yüzden eksiksiz okunur —
 * hidrasyon gecikirse ya da JavaScript hiç çalışmazsa sayfa boş kalmaz.
 *
 * Animasyon bir kez oynar; geri kaydırınca tekrar gizlenmez.
 * `prefers-reduced-motion` açıksa CSS tarafında tamamen kapanır.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** ms cinsinden gecikme; ızgaradaki kartları sırayla getirmek için. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"static" | "hidden" | "shown">("static");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Zaten ekranda olan blok animasyona hiç girmez; aksi halde ilk boyamada
    // görünür olan içerik bir anlığına kaybolurdu.
    if (node.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setState("hidden");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-state={state}
      className={cn("mk-reveal", className)}
      style={delay ? ({ "--mk-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Açılışta beliren blok — saf CSS, istemci JavaScript'i beklemez.
 * Ekranın ilk görünen kısmında (hero) bunun için kullanılır.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn("mk-in", className)}
      style={delay ? ({ "--mk-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
