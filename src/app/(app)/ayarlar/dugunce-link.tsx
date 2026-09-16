"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Venue } from "@/lib/database.types";
import { generateDugunceLinkCode } from "./actions";

/** Radix'te SelectItem değeri boş string OLAMAZ. */
const ISLETME_GENELI = "isletme-geneli";

/**
 * Düğünce bağlama kodu.
 *
 * Düğünce (dugunce.com) pazaryerinde profili olan işletme, buradan aldığı
 * kodu oraya girerek iki hesabı eşleştiriyor. Eşleşme kurulduğu anda o
 * mekana gelen teklif talepleri — geçmiştekiler dahil — DavetPro'daki
 * talep listesine düşmeye başlıyor.
 *
 * Kod tek kullanımlık ve 15 dakika geçerli. Kalıcı bir anahtar değil;
 * yalnızca iki hesabın aynı kişiye ait olduğunu kanıtlıyor.
 */
export function DugunceLink({ venues }: { venues: Venue[] }) {
  // Radix boş string'i value olarak KABUL ETMİYOR; "işletme geneli" için
  // nöbetçi bir değer kullanıyoruz ve sunucuya null olarak gidiyor.
  const [venueId, setVenueId] = useState<string>(ISLETME_GENELI);
  const [sonuc, setSonuc] = useState<{ code: string; validUntil: string } | null>(null);
  const [kalan, setKalan] = useState<number | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [pending, startTransition] = useTransition();

  // Geri sayım yalnızca kod üretildikten sonra çalışıyor; sunucuda hiç
  // render edilmediği için hydration uyuşmazlığı riski yok.
  useEffect(() => {
    if (!sonuc) return;
    const bitis = new Date(sonuc.validUntil).getTime();
    const guncelle = () => setKalan(Math.max(0, Math.floor((bitis - Date.now()) / 1000)));
    guncelle();
    const t = setInterval(guncelle, 1000);
    return () => clearInterval(t);
  }, [sonuc]);

  const suresiDoldu = kalan !== null && kalan === 0;

  function uret() {
    startTransition(async () => {
      const result = await generateDugunceLinkCode({
        venueId: venueId === ISLETME_GENELI ? "" : venueId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSonuc(result.data);
      setKopyalandi(false);
    });
  }

  async function kopyala() {
    if (!sonuc) return;
    try {
      await navigator.clipboard.writeText(sonuc.code);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      // Pano izni yoksa kullanıcı kodu elle okuyup yazabilir; kod zaten
      // ekranda büyük puntoyla duruyor.
      toast.error("Kopyalanamadı, kodu elle girebilirsiniz.");
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <ol className="space-y-2 text-sm text-muted-foreground">
        <li>
          <strong className="text-foreground">1.</strong> Aşağıdan bağlama kodu
          üretin.
        </li>
        <li>
          <strong className="text-foreground">2.</strong> Düğünce&apos;de
          mekanınızın panelinde <strong>Entegrasyon</strong> bölümüne girin.
        </li>
        <li>
          <strong className="text-foreground">3.</strong> Kodu oraya yapıştırın.
          Bağlantı kurulduğu anda o mekanın <strong>geçmiş talepleri de</strong>{" "}
          DavetPro&apos;ya aktarılır.
        </li>
      </ol>

      {venues.length > 1 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="dugunce-salon">
            Hangi salon?
          </label>
          <Select value={venueId} onValueChange={setVenueId}>
            <SelectTrigger id="dugunce-salon">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ISLETME_GENELI}>Yalnızca işletmeyi bağla</SelectItem>
              {venues.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Düğünce&apos;deki mekan profili bu salona eşleşir. Emin değilseniz
            boş bırakın; talepler yine işletmenize düşer.
          </p>
        </div>
      )}

      {sonuc ? (
        <div className="rounded-lg border bg-muted/40 p-5">
          <p className="text-xs text-muted-foreground">Bağlama kodunuz</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="font-mono text-3xl font-semibold tracking-[0.3em] tabular-nums">
              {sonuc.code}
            </code>
            <Button variant="outline" size="sm" onClick={kopyala} disabled={suresiDoldu}>
              {kopyalandi ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {kopyalandi ? "Kopyalandı" : "Kopyala"}
            </Button>
          </div>

          <p className="mt-3 text-sm">
            {suresiDoldu ? (
              <span className="text-destructive">
                Kodun süresi doldu. Yeni bir kod üretin.
              </span>
            ) : (
              <span className="text-muted-foreground">
                Kalan süre:{" "}
                <strong className="tabular-nums text-foreground">
                  {kalan === null ? "—" : formatSure(kalan)}
                </strong>{" "}
                · tek kullanımlık
              </span>
            )}
          </p>

          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={uret}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-4" aria-hidden />
            )}
            Yeni kod üret
          </Button>
        </div>
      ) : (
        <Button onClick={uret} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Bağlama kodu üret
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Düğünce hesabınız yok mu?{" "}
        <a
          href="https://dugunce.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          dugunce.com
        </a>{" "}
        üzerinden mekanınızı yayınlayarak teklif talebi almaya başlayabilirsiniz.
      </p>
    </div>
  );
}

function formatSure(saniye: number): string {
  const dk = Math.floor(saniye / 60);
  const sn = saniye % 60;
  return `${dk}:${String(sn).padStart(2, "0")}`;
}
