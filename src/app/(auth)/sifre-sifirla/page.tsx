import Link from "next/link";
import type { Metadata } from "next";
import { ResetRequestForm } from "./reset-request-form";

export const metadata: Metadata = { title: "Şifremi unuttum" };

export default function ResetPasswordPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Şifrenizi mi unuttunuz?</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        E-posta adresinizi girin, yeni şifre belirlemeniz için bağlantı gönderelim.
      </p>

      <ResetRequestForm />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link href="/giris" className="font-medium text-foreground underline-offset-4 hover:underline">
          Girişe dön
        </Link>
      </p>
    </div>
  );
}
