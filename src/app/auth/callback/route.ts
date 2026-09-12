import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

/**
 * E-posta bağlantılarının (şifre sıfırlama, davet, doğrulama) indiği yer.
 *
 * İKİ BİÇİM destekleniyor:
 *
 * - `token_hash` + `type` → verifyOtp. Tercih edilen yol: DURUMSUZ, yani
 *   bağlantı hangi tarayıcıda açılırsa açılsın çalışıyor.
 * - `code` → exchangeCodeForSession. PKCE akışı; kaydı BAŞLATAN tarayıcıda
 *   bırakılan doğrulayıcı çereze muhtaç. Posta uygulamasının kendi içindeki
 *   tarayıcıda ya da başka bir cihazda açılan bağlantı, geçerli olduğu halde
 *   burada başarısız oluyordu. Halihazırda gönderilmiş bağlantılar için
 *   duruyor.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const nextParam = searchParams.get("next") ?? "/panel";

  // Açık yönlendirme (open redirect) olmasın: yalnızca uygulama içi yollar.
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/panel";

  const supabase = await createClient();

  if (tokenHash && type && OTP_TYPES.includes(type as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    // Sebebi yutmuyoruz: kullanıcıya tek bir genel mesaj gösteriliyor, neyin
    // yanlış gittiğini ancak burada görebiliyoruz.
    console.error("[auth] verifyOtp başarısız:", type, error.message);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("[auth] exchangeCodeForSession başarısız:", error.message);
  }

  return NextResponse.redirect(`${origin}/giris?hata=baglanti`);
}
