import { View } from "react-native";
import { formatDate } from "@/lib/format";
import { useAppSession, useSessionContext } from "~/lib/auth/session";
import { Button } from "~/ui/Button";
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
  return (
    <Screen bottomInset>
      <View style={{ flex: 1, justifyContent: "center", padding: 16, gap: 16 }}>
        <Text variant="titleLarge">Erişim süresi doldu</Text>
        <Text variant="body" color="textSecondary">
          {s.business.name} için erişim süresi {sub ? formatDate(sub.accessUntil) : ""} tarihinde sona erdi. Verileriniz saklanmaya devam eder; hesap durumunuzu DavetPro web panelinden görüntüleyebilirsiniz.
        </Text>
        <Button label="Yeniden kontrol et" variant="secondary" onPress={reload} />
        <Button label="Çıkış yap" variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}
