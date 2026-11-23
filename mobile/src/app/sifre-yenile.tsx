import { useState } from "react";
import { View } from "react-native";
import { Controller } from "react-hook-form";
import { useForm } from "~/lib/use-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toTurkishError } from "@/lib/errors";
import { newPasswordSchema, type NewPasswordInput } from "~/lib/domain/auth-schemas";
import { useSessionContext } from "~/lib/auth/session";
import { useSubmitGuard } from "~/lib/hooks";
import { supabase } from "~/lib/supabase";
import { Banner } from "~/ui/Feedback";
import { Button } from "~/ui/Button";
import { TextField } from "~/ui/Inputs";
import { InlineHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { Text } from "~/ui/Text";

/** Davet ya da şifre sıfırlama bağlantısıyla açılan oturumda yeni şifre belirler. */
export default function NewPasswordScreen() {
  const { setPasswordSetupPending, signOut } = useSessionContext();
  const guard = useSubmitGuard();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors } } = useForm<NewPasswordInput>({ resolver: zodResolver(newPasswordSchema), defaultValues: { password: "", passwordAgain: "" } });

  const onSubmit = handleSubmit((v) =>
    guard.run(async () => {
      setError(null);
      const { error: err } = await supabase.auth.updateUser({ password: v.password });
      if (err) return setError(toTurkishError(err));
      setPasswordSetupPending(false); // Gate uygulamaya yönlendirir
    }),
  );

  const submit = () => { void onSubmit(); };

  return (
    <Screen>
      <InlineHeader title="Yeni şifre" back={false} trailing={<Button label="Vazgeç" variant="ghost" size="S" fullWidth={false} onPress={signOut} />} />
      <ScrollScreen>
        <Text variant="body" color="textSecondary">Hesabınız için yeni bir şifre belirleyin (en az 8 karakter).</Text>
        {error ? <Banner reveal tone="danger" title="Şifre kaydedilemedi" body={error} /> : null}
        <View style={{ gap: 16 }}>
          <Controller control={control} name="password" render={({ field }) => (
            <TextField label="Yeni şifre" icon="lock" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.password?.message} autoCapitalize="none" textContentType="newPassword" />
          )} />
          <Controller control={control} name="passwordAgain" render={({ field }) => (
            <TextField label="Yeni şifre (tekrar)" icon="lock" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.passwordAgain?.message} autoCapitalize="none" textContentType="newPassword" onSubmitEditing={submit} />
          )} />
          <Button label="Şifreyi kaydet" loading={guard.pending} onPress={submit} />
        </View>
      </ScrollScreen>
    </Screen>
  );
}
