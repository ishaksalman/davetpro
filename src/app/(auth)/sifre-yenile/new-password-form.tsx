"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, SubmitButton } from "@/components/auth/form-parts";
import { updatePasswordAction, type AuthState } from "../actions";

export function NewPasswordForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    updatePasswordAction,
    {},
  );

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <FormError message={state.error} />

      <div className="space-y-2">
        <Label htmlFor="password">Yeni şifre</Label>
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

      <div className="space-y-2">
        <Label htmlFor="passwordAgain">Yeni şifre (tekrar)</Label>
        <Input
          id="passwordAgain"
          name="passwordAgain"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>

      <SubmitButton>Şifreyi güncelle</SubmitButton>
    </form>
  );
}
