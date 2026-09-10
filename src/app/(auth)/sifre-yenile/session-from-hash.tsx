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
  // Başlangıçta hazır değil: hash yalnızca tarayıcıda okunabildiği için
  // kararı effect veriyor. Sunucu HTML'i de bu yüzden "doğrulanıyor" gösterir.
  const [hazir, setHazir] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [kimlik, setKimlik] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;

    async function calis() {
      // Mikro göreve erteleniyor: effect gövdesinde eşzamanlı setState,
      // React'te zincirleme render'a yol açıyor.
      await Promise.resolve();
      if (iptal) return;

      const params = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        // Jeton yok. Oturum varsa kullanıcı kendi şifresini değiştiriyordur;
        // yoksa bağlantı doğrudan açılmış ya da süresi dolmuş.
        if (hasSession) setHazir(true);
        else router.replace("/sifre-sifirla");
        return;
      }

      // Jeton varsa mevcut oturum ne olursa olsun o kazanır: bağlantı kimin
      // adına gönderildiyse onun hesabı açılmalı. Aksi hâlde zaten giriş
      // yapmış bir tarayıcıda davet sessizce yutuluyor ve form yanlış hesabın
      // şifresini değiştiriyordu.
      const supabase = createClient();
      const sonuc = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (iptal) return;

      if (sonuc.error) {
        setHata(toTurkishError(sonuc.error));
        return;
      }

      // Jetonlar adres çubuğunda ve geçmişte kalmasın.
      window.history.replaceState(null, "", window.location.pathname);

      const kullanici = await supabase.auth.getUser();
      if (iptal) return;

      // Hangi hesap için şifre belirlendiği görünsün: aynı tarayıcıda başka
      // bir hesap açıksa kullanıcı yanlış anlamasın.
      setKimlik(kullanici.data.user?.email ?? null);
      setHazir(true);
      router.refresh();
    }

    void calis();
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

  return (
    <>
      {kimlik && (
        <p className="mb-4 rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
          <strong className="text-foreground">{kimlik}</strong> hesabı için şifre
          belirliyorsunuz.
        </p>
      )}
      {children}
    </>
  );
}
