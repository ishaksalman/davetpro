import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/brand/logo";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "İşletme kurulumu" };

/**
 * E-posta doğrulaması nedeniyle kayıt anında işletmesi oluşturulamayan
 * kullanıcılar buraya düşer. Kayıt formundaki bilgiler önden doldurulur.
 */
export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const session = await getSession();
  if (session) redirect("/panel");

  const meta = user.user_metadata as { full_name?: string; business_name?: string };

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Logo className="mb-10" />
        <h1 className="text-2xl font-semibold tracking-tight">Son bir adım</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          İşletmenizi oluşturalım; ardından panelinize geçebilirsiniz.
        </p>
        <SetupForm
          defaultBusinessName={meta.business_name ?? ""}
          defaultFullName={meta.full_name ?? ""}
        />
      </div>
    </main>
  );
}
