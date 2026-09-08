"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { FormDialog, FormField } from "@/components/shared/form-dialog";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/schemas";
import { changePasswordAction } from "@/app/(auth)/actions";

/**
 * Kendi şifresini değiştirme. Kenar çubuğundaki kullanıcı menüsünden açılıyor;
 * hesaba ait bir işlem olduğu için işletme ayarlarında değil.
 */
export function ChangePasswordDialog({ trigger }: { trigger: React.ReactElement }) {
  const defaultValues: ChangePasswordInput = {
    currentPassword: "",
    password: "",
    passwordAgain: "",
  };

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema) as never,
    defaultValues,
  });

  return (
    <FormDialog
      trigger={trigger}
      title="Şifre değiştir"
      description="Güvenliğiniz için önce mevcut şifrenizi doğrulamanız gerekiyor."
      submitLabel="Şifreyi değiştir"
      form={form}
      defaultValues={defaultValues}
      action={changePasswordAction}
      successMessage="Şifreniz değiştirildi."
    >
      <FormField form={form} name="currentPassword" label="Mevcut şifre">
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...form.register("currentPassword")}
        />
      </FormField>

      <FormField
        form={form}
        name="password"
        label="Yeni şifre"
        description="En az 8 karakter."
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
        />
      </FormField>

      <FormField form={form} name="passwordAgain" label="Yeni şifre (tekrar)">
        <Input
          id="passwordAgain"
          type="password"
          autoComplete="new-password"
          {...form.register("passwordAgain")}
        />
      </FormField>
    </FormDialog>
  );
}
