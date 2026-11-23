import { FormScrollView } from "~/ui/FormScroll";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Controller } from "react-hook-form";
import { useForm } from "~/lib/use-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BUSINESS_TYPES, VERTICALS } from "@/lib/vertical";
import type { BusinessType } from "@/lib/database.types";
import { useTheme } from "~/design/theme";
import { BusinessTypeCard } from "~/features/onboarding/business-type-card";
import { createBusiness } from "~/lib/auth/create-business";
import { useSessionContext } from "~/lib/auth/session";
import { setupBusinessSchema, type SetupBusinessInput } from "~/lib/domain/auth-schemas";
import { useOnline, useSubmitGuard } from "~/lib/hooks";
import { clearPendingBusinessType, readPendingBusinessType } from "~/lib/onboarding";
import { Banner } from "~/ui/Feedback";
import { Button } from "~/ui/Button";
import { TextField } from "~/ui/Inputs";
import { Text } from "~/ui/Text";

/**
 * Oturum var ama işletme profili yok: işletme kurulumu (web `/isletme-kur` ile aynı adım).
 * İşin cinsi sonradan değiştirilemez: gider kategorileri, sözleşme şablonu ve kaynak adı buna göre kurulur.
 * Tanıtımda seçilen tür önden seçilir.
 */
export default function SetupScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const guard = useSubmitGuard();
  const { state, reload, signOut } = useSessionContext();
  const email = state.status === "noProfile" ? state.email : null;
  const [type, setType] = useState<BusinessType>("salon");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { void readPendingBusinessType().then((t) => t && setType(t)); }, []);

  const { scroll, control, handleSubmit, formState: { errors } } = useForm<SetupBusinessInput>({
    resolver: zodResolver(setupBusinessSchema),
    defaultValues: { businessName: "", fullName: "" },
  });

  const submit = handleSubmit((v) =>
    guard.run(async () => {
      setFormError(null);
      const r = await createBusiness({ ...v, businessType: type });
      if (!r.ok) { setFormError(r.error); return; }
      await clearPendingBusinessType();
      // Oturum yeniden okunur; profil artık var, Gate uygulamaya geçirir.
      await reload();
    }),
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bgCanvas }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FormScrollView controller={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, gap: 24, flexGrow: 1 }}>
        <View style={{ gap: 10 }}>
          <Text variant="display" accessibilityRole="header">Son bir adım</Text>
          <Text variant="body" color="textSecondary">
            {email ? `${email} hesabı için ` : ""}işletmeni oluşturalım; ardından panele geçersin.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <Text variant="subheadSemibold">Ne iş yapıyorsun?</Text>
          <View style={{ gap: 12 }} accessibilityRole="radiogroup">
            {BUSINESS_TYPES.map((t) => <BusinessTypeCard key={t} type={t} selected={type === t} onPress={() => setType(t)} />)}
          </View>
          <Text variant="footnote" color="textTertiary">Bu seçim sonradan değiştirilemez.</Text>
        </View>

        {!online ? <Banner tone="offline" title="Çevrimdışısın" body="İşletmeyi oluşturmak için internet bağlantısı gerekli." /> : null}
        {formError ? <Banner reveal tone="danger" title="Kurulum tamamlanamadı" body={formError} /> : null}

        <View style={{ gap: 16 }}>
          <Controller control={control} name="businessName" render={({ field }) => (
            <TextField label="İşletme adı" icon="building" placeholder={VERTICALS[type].businessPlaceholder} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
              error={errors.businessName?.message} autoCapitalize="words" returnKeyType="next" />
          )} />
          <Controller control={control} name="fullName" render={({ field }) => (
            <TextField label="Ad soyad" icon="user" placeholder="Ayşe Yılmaz" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
              error={errors.fullName?.message} autoCapitalize="words" autoComplete="name" textContentType="name" returnKeyType="go" onSubmitEditing={() => void submit()} />
          )} />
        </View>

        <View style={{ flex: 1, minHeight: 8 }} />
        <Button label="Kurulumu tamamla" loading={guard.pending} disabled={!online} onPress={() => void submit()} />
        <Button label="Çıkış yap" variant="ghost" onPress={signOut} />
      </FormScrollView>
    </KeyboardAvoidingView>
  );
}
