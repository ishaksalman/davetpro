import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { NewPasswordForm } from "./new-password-form";
import { SessionFromHash } from "./session-from-hash";

export const metadata: Metadata = { title: "Yeni şifre" };

/**
 * Davet ve şifre sıfırlama bağlantılarının indiği sayfa.
 *
 * Burada sunucu tarafında yönlendirme YAPILMIYOR: Supabase jetonları URL'in
 * hash kısmında gönderiyor ve hash sunucuya ulaşmıyor. Oturumu göremeyip
 * yönlendirseydik, davet edilen kullanıcı jetonu işlenmeden dışarı atılırdı.
 * Kararı istemci veriyor.
 */
export default async function NewPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const hasSession = Boolean(data?.claims?.sub);

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Yeni şifrenizi belirleyin</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Belirledikten sonra doğrudan panelinize yönlendirileceksiniz.
      </p>
      <SessionFromHash hasSession={hasSession}>
        <NewPasswordForm />
      </SessionFromHash>
    </div>
  );
}
