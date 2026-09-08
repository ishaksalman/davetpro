import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * DavetMekanı ↔ DavetPro istek imzalama.
 *
 * Kontrat: ~/Desktop/davetmekani/docs/DAVETPRO-ENTEGRASYON.md
 * İki depoda da aynı şema uygulanır; birini değiştirirken diğerini unutma.
 *
 *   X-Dm-Timestamp: <unix saniye>
 *   X-Dm-Signature: sha256=<hex>
 *   HMAC girdisi:   `${timestamp}.${ham gövde}`
 */

/** İmzanın kabul edildiği zaman penceresi (replay koruması). */
const TOLERANS_SANIYE = 5 * 60;

export type DogrulamaSonucu =
  | { ok: true }
  | { ok: false; kod: 401 | 400; mesaj: string };

export function imzala(gövde: string, timestamp: number, secret: string): string {
  return (
    "sha256=" +
    createHmac("sha256", secret).update(`${timestamp}.${gövde}`).digest("hex")
  );
}

export function dogrula(
  gövde: string,
  headers: Headers,
  secret: string | undefined,
): DogrulamaSonucu {
  if (!secret) {
    // Yapılandırma eksikse isteği kabul etmiyoruz; "imza yoksa geç" davranışı
    // entegrasyonu tamamen açık bırakır.
    return { ok: false, kod: 401, mesaj: "Entegrasyon yapılandırılmamış." };
  }

  const ts = Number(headers.get("x-dm-timestamp"));
  const imza = headers.get("x-dm-signature");

  if (!Number.isFinite(ts) || !imza) {
    return { ok: false, kod: 400, mesaj: "İmza başlıkları eksik." };
  }

  const fark = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (fark > TOLERANS_SANIYE) {
    return { ok: false, kod: 401, mesaj: "İstek zaman aşımına uğradı." };
  }

  const beklenen = imzala(gövde, ts, secret);
  const a = Buffer.from(beklenen);
  const b = Buffer.from(imza);

  // Uzunluk farkı timingSafeEqual'ı patlatır; önce kontrol ediyoruz.
  // Uzunluk bilgisi sızıyor ama imza uzunluğu zaten sabit ve herkese açık.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, kod: 401, mesaj: "İmza doğrulanamadı." };
  }

  return { ok: true };
}
