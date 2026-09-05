"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, SubmitButton } from "@/components/auth/form-parts";
import { setupBusinessAction, type AuthState } from "../(auth)/actions";

export function SetupForm({
  defaultBusinessName,
  defaultFullName,
}: {
  defaultBusinessName: string;
  defaultFullName: string;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    setupBusinessAction,
    {},
  );

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <FormError message={state.error} />

      <div className="space-y-2">
        <Label htmlFor="businessName">İşletme adı</Label>
        <Input
          id="businessName"
          name="businessName"
          defaultValue={defaultBusinessName}
          placeholder="Gül Düğün Salonu"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Ad soyad</Label>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={defaultFullName}
          placeholder="Ayşe Yılmaz"
          required
        />
      </div>

      <SubmitButton>Kurulumu tamamla</SubmitButton>
    </form>
  );
}
