import { useState } from "react";
import { View } from "react-native";
import { Controller } from "react-hook-form";
import { useForm } from "~/lib/use-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toTurkishError } from "@/lib/errors";
import { env } from "~/lib/env";
import { emailSchema, type EmailInput } from "~/lib/domain/auth-schemas";
import { useOnline, useSubmitGuard } from "~/lib/hooks";
import { supabase } from "~/lib/supabase";
import { Banner } from "~/ui/Feedback";
import { Button } from "~/ui/Button";
import { TextField } from "~/ui/Inputs";
import { InlineHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import * as Linking from "expo-linking";

export default function ResetPasswordScreen() {
  const online = useOnline();
  const guard = useSubmitGuard();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors } } = useForm<EmailInput>({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } });

  const onSubmit = handleSubmit((v) =>
    guard.run(async () => {
      setError(null);
      // Bağlantı uygulamayı açar (davetpro://auth/callback). Bu adres Supabase
      // Auth → URL Configuration → Redirect URLs listesinde olmalı; değilse
      // Supabase Site URL'e (web) düşer ve bağlantı tarayıcıda açılır.
      const { error: err } = await supabase.auth.resetPasswordForEmail(v.email, {
        redirectTo: Linking.createURL("auth/callback") || `${env.appUrl}/auth/callback?next=/sifre-yenile`,
      });
      // Web ile aynı: hata olsa da aynı mesaj — hangi e-postanın kayıtlı olduğu sızdırılmaz.
      // Ağ hatası ayrı: kullanıcı isteğin hiç gitmediğini bilmeli.
      if (err && /fetch|network/i.test(err.message)) return setError(toTurkishError(err));
      setNotice("Bu adres kayıtlıysa şifre sıfırlama bağlantısı gönderildi. E-postanızı kontrol edin.");
    }),
  );

  const submit = () => { void onSubmit(); };

  return (
    <Screen>
      <InlineHeader title="Şifre sıfırla" />
      <ScrollScreen>
        <Text variant="body" color="textSecondary">E-posta adresinizi girin; size yeni şifre belirleyeceğiniz bir bağlantı gönderelim.</Text>
        {notice ? <Banner tone="success" title="Bağlantı gönderildi" body={notice} /> : null}
        {error ? <Banner reveal tone="danger" title="Gönderilemedi" body={error} /> : null}
        {!online ? <Banner tone="offline" title="Çevrimdışısınız" /> : null}
        <View style={{ gap: 16 }}>
          <Controller control={control} name="email" render={({ field }) => (
            <TextField label="E-posta" icon="mail" value={field.value} onChangeText={field.onChange} error={errors.email?.message} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" returnKeyType="send" onSubmitEditing={submit} />
          )} />
          <Button label="Bağlantı gönder" loading={guard.pending} disabled={!online} onPress={submit} />
        </View>
      </ScrollScreen>
    </Screen>
  );
}
