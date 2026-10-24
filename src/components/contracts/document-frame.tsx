"use client";

import { useEffect, useRef, useState } from "react";

/** A4'ün ekrandaki genişliği (210 mm, CSS'te 96 dpi). */
const SHEET_WIDTH_PX = (210 / 25.4) * 96;

/**
 * A4 sayfayı ekranda kağıt gibi göstermek için gri zemin + gölge.
 *
 * Dar ekranda sayfa orantılı küçültülüp genişliğe sığdırılıyor: belgenin
 * yerleşimi değişmiyor (önizleme ile çıktı aynı kalsın), yalnızca ölçeği.
 *
 * transform: scale — `zoom` değil: iOS Safari zoom'u genişliğe uygulayıp
 * yazı boyutuna uygulamıyordu; metin dar sütuna sıkışıp her kelimede
 * kırılıyordu. transform yerleşimi küçültmediği için dış kutunun boyu
 * ölçekle elle ayarlanıyor. Baskıda ölçek globals.css'teki @media print
 * kuralıyla sıfırlanıyor: A4 kendi boyutunda basılıyor.
 */
export function DocumentFrame({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    const sheet = sheetRef.current;
    if (!el || !sheet) return;
    const observer = new ResizeObserver(() => {
      const style = getComputedStyle(el);
      const available =
        el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setScale(Math.min(1, available / SHEET_WIDTH_PX));
      // transform yerleşimi etkilemediği için ölçülen yükseklik ölçeksiz.
      setHeight(sheet.offsetHeight);
    });
    observer.observe(el);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="document-frame overflow-hidden rounded-xl bg-muted/50 p-3 sm:p-8">
      <div
        className="document-frame-box mx-auto"
        style={{
          width: SHEET_WIDTH_PX * scale,
          height: height === null ? undefined : height * scale,
        }}
      >
        <div
          ref={sheetRef}
          className="document-frame-sheet shadow-lg"
          style={{
            width: SHEET_WIDTH_PX,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
