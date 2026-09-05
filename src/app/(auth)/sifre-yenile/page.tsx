import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Yeni şifre" };

/**
 * Sıfırlama bağlantısı /auth/callback üzerinden geçici bir oturum açar;
 * bu sayfa yalnızca o oturumla anlamlıdır.
 */
export default async function NewPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/sifre-sifirla");

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Yeni şifrenizi belirleyin</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Belirledikten sonra doğrudan panelinize yönlendirileceksiniz.
      </p>
      <NewPasswordForm />
    </div>
  );
}
