import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import { KORUNAN_YOLLAR, MISAFIR_YOLLARI, onekUyar } from "@/lib/routes";

/** Oturumu tazeler ve korumalı rotalara erişimi denetler. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims() JWT imzasını yerel olarak doğrular (asimetrik anahtarlı
  // projelerde ağ isteği yok). getSession()'a asla güvenilmez; o yalnızca
  // çerezi okur, imzayı doğrulamaz.
  // Supabase'e ulaşılamazsa oturumsuz kabul edilir: uygulama 500 vermek yerine
  // giriş ekranına düşer.
  let hasUser = false;
  try {
    const { data } = await supabase.auth.getClaims();
    hasUser = Boolean(data?.claims?.sub);
  } catch (error) {
    console.error("[proxy] Supabase oturumu doğrulanamadı:", error);
  }

  const { pathname } = request.nextUrl;
  // Yalnızca uygulama yolları oturum istiyor (bkz. lib/routes.ts). Tanıtım
  // sayfaları, sözleşme bağlantısı ve var olmayan adresler serbest geçiyor;
  // olmayan adres Next'in 404 sayfasına düşüyor, girişe değil.
  const isProtected = onekUyar(pathname, KORUNAN_YOLLAR);
  const isGuestOnly = onekUyar(pathname, MISAFIR_YOLLARI);

  if (!hasUser && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    url.searchParams.set("devam", pathname);
    return NextResponse.redirect(url);
  }

  // Anasayfa da burada: sayfanın kendisi oturuma bakmayınca statik
  // üretilip CDN'den sunuluyor (ilk bayt süresi arama sıralamasında sayılıyor).
  if (hasUser && (isGuestOnly || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/panel";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
