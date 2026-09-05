"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormNotice, SubmitButton } from "@/components/auth/form-parts";
import { requestPasswordResetAction, type AuthState } from "../actions";

export function ResetRequestForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    requestPasswordResetAction,
    {},
  );

  if (state.notice) return <div className="mt-8"><FormNotice message={state.notice} /></div>;

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <FormError message={state.error} />
      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <SubmitButton>Sıfırlama bağlantısı gönder</SubmitButton>
    </form>
  );
}
