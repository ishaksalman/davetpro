"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Sayfa açılınca yazdırma penceresini açar ve ekranda küçük bir açıklama
 * bırakır. Tarayıcının yazdırma diyalogu dışında bir "indirme" mekanizması
 * yok — kullanıcıya bunu doğrudan söylüyoruz.
 */
export function PrintTrigger({
  fileName,
  savingPdf,
}: {
  fileName: string;
  savingPdf: boolean;
}) {
  useEffect(() => {
    let cancelled = false;

    // Yazı tipleri yerleşmeden yazdırmak satır kaymalarına yol açıyor.
    // Görseller de beklenmeli: işletme logosu dış bir adresten geliyorsa
    // yüklenmeden yazdırılınca antette boşluk kalıyordu.
    async function hazirla() {
      const bekleyenler: Promise<unknown>[] = [];

      if (document.fonts?.ready) bekleyenler.push(document.fonts.ready);

      for (const img of Array.from(document.images)) {
        if (img.complete) continue;
        // decode() bozuk görselde reddediyor; yazdırmayı engellememeli.
        bekleyenler.push(img.decode().catch(() => undefined));
      }

      // Yanıt vermeyen bir kaynak yazdırmayı süresiz kilitlemesin.
      const zamanAsimi = new Promise((resolve) => window.setTimeout(resolve, 3000));
      await Promise.race([Promise.all(bekleyenler), zamanAsimi]);

      if (!cancelled) window.print();
    }

    void hazirla();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-center gap-3 border-b bg-white px-4 py-3 text-sm text-neutral-600">
      <span>
        {savingPdf ? (
          <>
            Açılan pencerede hedef olarak <strong>PDF olarak kaydet</strong>
            &apos;i seçin. Önerilen dosya adı:{" "}
            <span className="font-mono text-xs">{fileName}.pdf</span>
          </>
        ) : (
          <>Yazdırma penceresi açılmazsa aşağıdaki düğmeyi kullanın.</>
        )}
      </span>
      <Button size="sm" variant="outline" onClick={() => window.print()}>
        <Printer />
        Yazdır
      </Button>
    </div>
  );
}
