"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toTurkishError } from "@/lib/errors";

/**
 * Davet ve şifre sıfırlama bağlantılarındaki oturumu kurar.
 *
 * Supabase bu bağlantılarda jetonları URL'in HASH kısmında gönderiyor
 * (`#access_token=...&refresh_token=...`). Hash tarayıcıda kalır, sunucuya
 * hiç gitmez — bu yüzden sunucu tarafı hiçbir kod onu göremiyordu ve davet
 * edilen kullanıcı boş bir sayfaya düşüyordu.
 *
 * Burada tarayıcı istemcisiyle oturum kuruluyor; @supabase/ssr çerezleri
 * yazdığı için sonrasında sunucu da oturumu görüyor.
 */
export function SessionFromHash({
  hasSession,
  children,
}: {
  hasSession: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [hazir, setHazir] = useState(hasSession);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    if (hasSession) return;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      // Ne oturum ne jeton var: bağlantı doğrudan açılmış veya süresi dolmuş.
      router.replace("/sifre-sifirla");
      return;
    }

    let iptal = false;
    const supabase = createClient();
    void supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then((sonuc: { error: { message: string } | null }) => {
        if (iptal) return;
        if (sonuc.error) {
          setHata(toTurkishError(sonuc.error));
          return;
        }
        // Jetonlar adres çubuğunda ve geçmişte kalmasın.
        window.history.replaceState(null, "", window.location.pathname);
        setHazir(true);
        router.refresh();
      });

    return () => {
      iptal = true;
    };
  }, [hasSession, router]);

  if (hata) {
    return (
      <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
        Bağlantı geçersiz veya süresi dolmuş: {hata} Yeni bir bağlantı
        isteyebilirsiniz.
      </p>
    );
  }

  if (!hazir) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Bağlantı doğrulanıyor…
      </p>
    );
  }

  return <>{children}</>;
}
