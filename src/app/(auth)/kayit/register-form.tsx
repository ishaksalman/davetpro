"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormError, FormNotice, SubmitButton } from "@/components/auth/form-parts";
import { registerAction, type AuthState } from "../actions";

export function RegisterForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(registerAction, {});

  if (state.notice) {
    return <FormNotice message={state.notice} />;
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <FormError message={state.error} />

      <div className="space-y-2">
        <Label htmlFor="businessName">İşletme adı</Label>
        <Input id="businessName" name="businessName" placeholder="Gül Düğün Salonu" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Ad soyad</Label>
        <Input id="fullName" name="fullName" autoComplete="name" placeholder="Ayşe Yılmaz" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="ornek@salonum.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">En az 8 karakter.</p>
      </div>

      {/* Ticari ileti rızası: mevzuat gereği önceden işaretli OLAMAZ ve
          kaydı engellememeli. İşaretlenirse rızanın alındığı an profile
          yazılıyor; kanıt olarak zaman damgası gerekiyor. */}
      <div className="flex items-start gap-2.5">
        <Checkbox id="marketingConsent" name="marketingConsent" className="mt-0.5" />
        <Label
          htmlFor="marketingConsent"
          className="text-sm leading-relaxed font-normal text-muted-foreground"
        >
          DavetPro&apos;dan kampanya ve duyuru e-postaları almak istiyorum.
          İstediğiniz zaman vazgeçebilirsiniz.
        </Label>
      </div>

      <SubmitButton>Hesabı oluştur</SubmitButton>
    </form>
  );
}
