import { FormScrollView } from "~/ui/FormScroll";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { env } from "~/lib/env";
import { Controller } from "react-hook-form";
import { useForm } from "~/lib/use-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BUSINESS_TYPES } from "@/lib/vertical";
import type { BusinessType } from "@/lib/database.types";
import { useTheme } from "~/design/theme";
import { signUpWithEmail } from "~/lib/auth/sign-up";
import { passwordStrength } from "~/lib/domain/password-strength";
import { useOnline, useSubmitGuard } from "~/lib/hooks";
import { BusinessTypeCard } from "~/features/onboarding/business-type-card";
import { savePendingBusinessType, readPendingBusinessType } from "~/lib/onboarding";
import { Banner } from "~/ui/Feedback";
import { Button, IconButton } from "~/ui/Button";
import { TextField } from "~/ui/Inputs";
import { Text } from "~/ui/Text";

const schema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta adresi girin."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı."),
});
type Input = z.input<typeof schema>;

const TOTAL = 2;

function StepHeader({ step, onBack }: { step: number; onBack: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, height: 44 }}>
      <IconButton icon="chevron-left" label="Geri" variant="outline" onPress={onBack} />
      <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < step ? colors.actionPrimary : colors.borderStrong }} />
        ))}
      </View>
      <Text variant="footnoteMedium" color="textTertiary">{step} / {TOTAL}</Text>
    </View>
  );
}

/** Kurulum: 1) işletme tipi 2) hesap (Figma "Onboarding 2026" 05–06). */
export default function SignUpScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const guard = useSubmitGuard();
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<BusinessType>("salon");
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => { void readPendingBusinessType().then((t) => t && setType(t)); }, []);

  const { scroll, control, handleSubmit, watch, formState: { errors } } = useForm<Input>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const strength = passwordStrength(watch("password") ?? "");
  const barColor = strength.level <= 1 ? colors.feedbackDanger : strength.level === 2 ? colors.feedbackWarning : colors.feedbackSuccess;

  const submit = handleSubmit((v) =>
    guard.run(async () => {
      setFormError(null);
      await savePendingBusinessType(type);
      const r = await signUpWithEmail(v.email, v.password);
      if (!r.ok) setFormError(r.error);
      else if (r.needsEmailConfirmation) setSent(v.email.trim());
      // Oturum hemen açıldıysa Gate profil yoksa kuruluma yönlendirir.
    }),
  );
  const back = () => (step === 2 ? setStep(1) : router.canGoBack() ? router.back() : router.replace("/giris"));

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgCanvas, paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 24 }}>
        <Text variant="titleLarge" accessibilityRole="header">E-postanı doğrula</Text>
        <Banner tone="success" title="Hesabın oluşturuldu" body={`${sent} adresine bir doğrulama bağlantısı gönderdik. Bağlantıya dokununca uygulama açılır.`} />
        <View style={{ flex: 1 }} />
        <Button label="Giriş ekranına dön" variant="secondary" onPress={() => router.replace("/giris")} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bgCanvas }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FormScrollView controller={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, gap: 24, flexGrow: 1 }}>
        <StepHeader step={step} onBack={back} />

        {step === 1 ? (
          <>
            <View style={{ gap: 10 }}>
              <Text variant="display" accessibilityRole="header">İşletmen hangisi?</Text>
              <Text variant="body" color="textSecondary">Paneli buna göre kurarız. Sonradan değiştirilemez, o yüzden şimdi seç.</Text>
            </View>
            <View style={{ gap: 12 }} accessibilityRole="radiogroup">
              {BUSINESS_TYPES.map((t) => <BusinessTypeCard key={t} type={t} selected={type === t} onPress={() => setType(t)} />)}
            </View>
            <View style={{ flex: 1 }} />
            <Button label="Devam" icon="chevron-right" onPress={() => setStep(2)} />
          </>
        ) : (
          <>
            <View style={{ gap: 10 }}>
              <Text variant="display" accessibilityRole="header">Hesabını oluştur.</Text>
            </View>
            {!online ? <Banner tone="offline" title="Çevrimdışısınız" body="Hesap oluşturmak için internet bağlantısı gerekli." /> : null}
            {formError ? <Banner reveal tone="danger" title="Hesap oluşturulamadı" body={formError} /> : null}
            <View style={{ gap: 16 }}>
              <Controller control={control} name="email" render={({ field }) => (
                <TextField label="E-posta" icon="mail" placeholder="ornek@salonum.com" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
                  error={errors.email?.message} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="username" returnKeyType="next" />
              )} />
              <View style={{ gap: 8 }}>
                <Controller control={control} name="password" render={({ field }) => (
                  <TextField label="Şifre" icon="lock" placeholder="En az 8 karakter" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
                    error={errors.password?.message} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={() => void submit()} />
                )} />
                <View style={{ flexDirection: "row", gap: 4 }}>
                  {[1, 2, 3, 4].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= strength.level ? barColor : colors.bgSurfaceSunken }} />)}
                </View>
                <Text variant="caption" color="textSecondary" accessibilityLiveRegion="polite">{strength.label}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }} />
            <Text variant="footnote" color="textTertiary" align="center">
              Devam edersen{" "}
              <Text variant="footnote" color="textLink" onPress={() => void Linking.openURL(env.termsUrl)} accessibilityRole="link">Kullanım Koşulları</Text>
              {" "}ve{" "}
              <Text variant="footnote" color="textLink" onPress={() => void Linking.openURL(env.privacyUrl)} accessibilityRole="link">Gizlilik Politikası</Text>
              ’nı kabul etmiş olursun.
            </Text>
            <Button label="Hesap oluştur" loading={guard.pending} disabled={!online} onPress={() => void submit()} />
          </>
        )}
      </FormScrollView>
    </KeyboardAvoidingView>
  );
}
