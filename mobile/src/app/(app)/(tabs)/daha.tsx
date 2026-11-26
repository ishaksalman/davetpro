import { View } from "react-native";
import { router } from "expo-router";
import { useAppSession, useSessionContext } from "~/lib/auth/session";
import { Avatar } from "~/ui/Badge";
import { Button } from "~/ui/Button";
import { SegmentedControl } from "~/ui/Inputs";
import { useTheme } from "~/design/theme";
import { ListGroup, ListRow, SectionHeader } from "~/ui/List";
import { LargeHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { Text } from "~/ui/Text";

export default function MoreScreen() {
  const s = useAppSession();
  const { signOut, vertical: v, canFinance } = useSessionContext();
  const { preference, setPreference } = useTheme();
  return (
    <Screen>
      <LargeHeader title="Daha" />
      <ScrollScreen>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar name={s.profile.full_name} size="L" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="title2" numberOfLines={1}>{s.profile.full_name}</Text>
            <Text variant="footnote" color="textSecondary" numberOfLines={1}>{s.user.email ?? ""}</Text>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <SectionHeader title="Yönetim" />
          <ListGroup>
            <ListRow icon="inbox" title="Talepler ve teklifler" onPress={() => router.push("/talepler")} />
            <ListRow icon="users" title="Müşteriler" onPress={() => router.push("/musteriler")} />
            {v.usesDelivery && canFinance ? <ListRow icon="wallet" title="Finans" subtitle="Nakit akışı, kârlılık, gelir ve giderler" onPress={() => router.push("/finans-raporu")} /> : null}
          </ListGroup>
        </View>

        <View style={{ gap: 10 }}>
          <SectionHeader title="Tanımlar" />
          <ListGroup>
            <ListRow icon="package" title="Paketler" onPress={() => router.push("/tanimlar/paketler")} />
            {v.usesResource ? <ListRow icon="building" title={v.resource.plural} onPress={() => router.push("/tanimlar/salonlar")} /> : null}
            {v.usesTeams ? <ListRow icon="users" title="Ekipler" onPress={() => router.push("/tanimlar/ekipler")} /> : null}
            <ListRow icon="settings" title="Ayarlar" subtitle="İşletme, kullanıcılar, gider kategorileri" onPress={() => router.push("/ayarlar")} />
          </ListGroup>
        </View>

        <View style={{ gap: 10 }}>
          <SectionHeader title="Hesap" />
          <ListGroup>
            <ListRow icon="user" title="Hesabım" subtitle="Profil ve şifre" onPress={() => router.push("/hesap")} />
          </ListGroup>
        </View>

        <View style={{ gap: 10 }}>
          <SectionHeader title="Görünüm" />
          <SegmentedControl
            options={[{ value: "system", label: "Sistem" }, { value: "light", label: "Açık" }, { value: "dark", label: "Koyu" }]}
            value={preference}
            onChange={setPreference}
          />
        </View>

        <Button label="Çıkış yap" variant="outline" onPress={signOut} />
        <Text variant="caption" color="textTertiary" align="center">DavetPro mobil · sürüm 0.1.0</Text>
      </ScrollScreen>
    </Screen>
  );
}
