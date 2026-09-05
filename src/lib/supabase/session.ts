import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/** Oturum açmış kullanıcının işi olmayan sayfalar — panele yönlendirilir. */
const GUEST_ONLY_ROUTES = ["/giris", "/kayit", "/sifre-sifirla"];

/**
 * Oturumlu da oturumsuz da erişilebilen sayfalar.
 * /sifre-yenile bilerek burada: sıfırlama bağlantısı geçici bir oturum açar,
 * kullanıcı panele atılırsa yeni şifresini belirleyemez.
 */
const OPEN_ROUTES = ["/auth", "/sifre-yenile"];

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
  // "/" tanıtım sayfası: oturumsuz erişilebilir, oturumluysa sayfanın kendisi
  // panele yönlendirir. startsWith ile eşleştirilemez — her yolu yakalardı.
  const isOpen =
    pathname === "/" || OPEN_ROUTES.some((route) => pathname.startsWith(route));
  const isGuestOnly = GUEST_ONLY_ROUTES.some((route) => pathname.startsWith(route));

  if (!hasUser && !isOpen && !isGuestOnly) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    url.searchParams.set("devam", pathname);
    return NextResponse.redirect(url);
  }

  if (hasUser && isGuestOnly) {
    const url = request.nextUrl.clone();
    url.pathname = "/panel";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
