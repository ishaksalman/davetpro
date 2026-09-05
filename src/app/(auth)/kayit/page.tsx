import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "İşletme kaydı" };

export default function RegisterPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">İşletmenizi kaydedin</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Birkaç bilgi yeterli. Salonlarınızı ve paketlerinizi sonra ekleyebilirsiniz.
      </p>

      <RegisterForm />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Zaten hesabınız var mı?{" "}
        <Link href="/giris" className="font-medium text-foreground underline-offset-4 hover:underline">
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
