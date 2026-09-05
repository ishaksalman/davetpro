import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * E-posta bağlantılarının (şifre sıfırlama, davet, doğrulama) indiği yer.
 * Bağlantıdaki tek kullanımlık kodu oturuma çevirir.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/panel";

  // Açık yönlendirme (open redirect) olmasın: yalnızca uygulama içi yollar.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : "/panel";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/giris?hata=baglanti`);
}
