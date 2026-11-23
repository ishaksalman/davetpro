import { FormScrollView } from "~/ui/FormScroll";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { router } from "expo-router";
import { Controller } from "react-hook-form";
import { useForm } from "~/lib/use-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "~/design/theme";
import { loginSchema, type LoginInput } from "~/lib/domain/auth-schemas";
import { useSessionContext } from "~/lib/auth/session";
import { useOnline, useSubmitGuard } from "~/lib/hooks";
import { Banner } from "~/ui/Feedback";
import { BrandLogo } from "~/ui/Brand";
import { Button } from "~/ui/Button";
import { TextField } from "~/ui/Inputs";
import { Text } from "~/ui/Text";

export default function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn } = useSessionContext();
  const online = useOnline();
  const guard = useSubmitGuard();
  const [formError, setFormError] = useState<string | null>(null);

  const { scroll, control, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) =>
    guard.run(async () => {
      setFormError(null);
      const r = await signIn(values.email, values.password);
      // Başarıda Gate oturum durumuna göre yönlendirir; hatada girdiler korunur.
      if (!r.ok) setFormError(r.error);
    }),
  );

  const submit = () => { void onSubmit(); };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bgCanvas }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FormScrollView controller={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24, gap: 32, flexGrow: 1 }}>
        <View style={{ gap: 20 }}>
          <BrandLogo />
          <View style={{ gap: 6 }}>
            <Text variant="titleLarge" accessibilityRole="header">Tekrar hoş geldiniz</Text>
            <Text variant="body" color="textSecondary">Takviminiz ve kasanız cebinizde.</Text>
          </View>
        </View>

        {!online ? <Banner tone="offline" title="Çevrimdışısınız" body="Giriş yapmak için internet bağlantısı gerekli." /> : null}
        {formError ? <Banner reveal tone="danger" title="Giriş yapılamadı" body={formError} /> : null}

        <View style={{ gap: 16 }}>
          <Controller control={control} name="email" render={({ field }) => (
            <TextField
              label="E-posta" icon="mail" placeholder="ornek@firma.com" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
              error={errors.email?.message} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="username" returnKeyType="next"
            />
          )} />
          <Controller control={control} name="password" render={({ field }) => (
            <TextField
              label="Şifre" icon="lock" placeholder="Şifreniz" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
              error={errors.password?.message} secureTextEntry autoCapitalize="none" autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit}
            />
          )} />
        </View>

        <View style={{ gap: 8, alignItems: "center" }}>
          <Button label="Giriş yap" loading={guard.pending} disabled={!online} onPress={submit} />
          <Button label="Şifremi unuttum" variant="ghost" size="M" fullWidth={false} align="center" onPress={() => router.push("/sifre-sifirla")} />
        </View>

        <View style={{ flex: 1 }} />
        {__DEV__ ? <Button label="Bileşen önizlemesi (yalnızca geliştirme)" variant="ghost" size="S" fullWidth={false} align="center" onPress={() => router.push("/onizleme")} /> : null}
        <Button label="Hesabınız yok mu? Hesap oluşturun" variant="ghost" size="M" fullWidth={false} align="center" onPress={() => router.push("/kayit")} />
        <Text variant="footnote" color="textTertiary" align="center">
          Hesabınızı açtıktan sonra işletme kurulumunu bu uygulamada tamamlarsınız.
        </Text>
      </FormScrollView>
    </KeyboardAvoidingView>
  );
}
