import { Platform, View } from "react-native";
import * as Linking from "expo-linking";
import { formatDate } from "@/lib/format";
import { subscriptionWhatsAppLink } from "@/lib/subscription";
import { useAppSession, useSessionContext } from "~/lib/auth/session";
import { Button } from "~/ui/Button";
import { Banner } from "~/ui/Feedback";
import { Screen } from "~/ui/Screen";
import { Text } from "~/ui/Text";

/**
 * Süresi dolmuş hesap. Web `requireSession` ile aynı davranış: yönlendirme.
 * DİKKAT: bu bir ARAYÜZ kilidi — RLS abonelik süresini zorlamıyor; token geçerli
 * kaldığı için doğrudan API isteği yazmaya devam edebilir (README "Bilinen sınırlar").
 */
export default function SubscriptionScreen() {
  const s = useAppSession();
  const { reload, signOut } = useSessionContext();
  const sub = s.subscription;
  const link = sub
    ? subscriptionWhatsAppLink({ state: sub.state, businessName: s.business.name, referenceCode: sub.referenceCode, email: s.user.email })
    : null;
  return (
    <Screen bottomInset>
      <View style={{ flex: 1, justifyContent: "center", padding: 16, gap: 16 }}>
        <Text variant="titleLarge">Erişim süresi doldu</Text>
        <Text variant="body" color="textSecondary">
          {s.business.name} için erişim süresi {sub ? formatDate(sub.accessUntil) : ""} tarihinde sona erdi. Hesap durumunuz için destek ekibimizle iletişime geçin; verileriniz saklanmaya devam eder.
        </Text>
        {sub ? <Banner tone="info" title="Referans kodunuz" body={sub.referenceCode} /> : null}
        {/* Apple 3.1.1: iOS'ta ödeme/abonelik yönlendirmesi yok; WhatsApp ile uzatma talebi yalnızca Android'de. */}
        {link && Platform.OS !== "ios" ? <Button label="WhatsApp ile uzatma talep et" onPress={() => Linking.openURL(link)} /> : null}
        <Button label="Yeniden kontrol et" variant="secondary" onPress={reload} />
        <Button label="Çıkış yap" variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}
