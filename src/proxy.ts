import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/**
 * Next.js 16'da middleware'in yeni adı. Her istekte Supabase oturumunu
 * tazeler ve korumalı rotaları denetler.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Statik dosyalar ve görseller hariç tüm rotalar.
     *
     * `api/integrations` DIŞARIDA: bu uç noktalar oturumla değil HMAC imzasıyla
     * kimlik doğruluyor (DavetMekanı entegrasyonu). Matcher'a girerlerse
     * oturumsuz istek /giris'e yönlendirilir ve çağıran HTML alır.
     */
    "/((?!api/integrations|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
