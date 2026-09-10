"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Elle yazılması gereken bir değeri (IBAN, referans kodu) tek tıkla kopyalar.
 *
 * Değer her zaman görünür duruyor: kopyalama başarısız olursa ya da kullanıcı
 * telefondan bakıyorsa elle yazabilmesi gerekiyor.
 */
export function CopyValue({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [kopyalandi, setKopyalandi] = useState(false);

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(value);
      setKopyalandi(true);
      // Onay kalıcı olmasın; kullanıcı ikinci kez kopyalayabildiğini görsün.
      window.setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      toast.error("Kopyalanamadı. Değeri elle yazabilirsiniz.");
    }
  }

  return (
    <button
      type="button"
      onClick={kopyala}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted",
        className,
      )}
      aria-label={`${value} — kopyala`}
    >
      <span className="tabular-nums">{value}</span>
      {kopyalandi ? (
        <Check className="size-3.5 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="size-3.5 text-muted-foreground" aria-hidden />
      )}
    </button>
  );
}
