"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, SubmitButton } from "@/components/auth/form-parts";
import { loginAction, type AuthState } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="mt-8 space-y-4">
      {next && <input type="hidden" name="devam" value={next} />}
      <FormError message={state.error} />

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
          autoComplete="current-password"
          required
        />
      </div>

      <SubmitButton>Giriş yap</SubmitButton>
    </form>
  );
}
