import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Giriş yap" };

export default async function LoginPage({ searchParams }: PageProps<"/giris">) {
  const { devam, hata } = await searchParams;

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Tekrar hoş geldiniz</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Salonunuzun paneline erişmek için giriş yapın.
      </p>

      {hata === "baglanti" && (
        <p
          role="alert"
          className="mt-6 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          Bağlantı geçersiz veya süresi dolmuş. Lütfen yeniden deneyin.
        </p>
      )}

      <LoginForm next={typeof devam === "string" ? devam : undefined} />

      <p className="mt-4 text-center text-sm">
        <Link
          href="/sifre-sifirla"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Şifremi unuttum
        </Link>
      </p>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Hesabınız yok mu?{" "}
        <Link href="/kayit" className="font-medium text-foreground underline-offset-4 hover:underline">
          İşletmenizi kaydedin
        </Link>
      </p>
    </div>
  );
}
