import { router } from "expo-router";
import { useSessionContext, useAppSession } from "~/lib/auth/session";
import { useManageCategories, useMembers2 } from "~/lib/data/management";
import { ListGroup, ListRow } from "~/ui/List";
import { InlineHeader, Screen, ScrollScreen } from "~/ui/Screen";

/**
 * Ayarlar menüsü: kategoriler (web'deki sekmelerle aynı: İşletme, Kullanıcılar, Gider
 * kategorileri). Her satır kendi detay ekranını açar.
 */
export default function SettingsMenu() {
  const s = useAppSession();
  const { canFinance } = useSessionContext();
  const members = useMembers2();
  const cats = useManageCategories(canFinance);
  return (
    <Screen>
      <InlineHeader title="Ayarlar" />
      <ScrollScreen bottomPad={40}>
        <ListGroup>
          <ListRow icon="briefcase" title="İşletme" subtitle={s.business.name} onPress={() => router.push("/ayarlar/isletme")} />
          <ListRow icon="users" title="Kullanıcılar" subtitle={members.data ? `${members.data.length} kullanıcı` : "Roller ve yetkiler, davet"} onPress={() => router.push("/ayarlar/kullanicilar")} />
          {canFinance ? <ListRow icon="receipt" title="Gider kategorileri" subtitle={cats.data ? `${cats.data.length} kategori` : "Gider türleri"} onPress={() => router.push("/ayarlar/kategoriler")} /> : null}
          <ListRow icon="lock" title="Hesap ve abonelik" subtitle="E-posta, şifre, erişim süresi" onPress={() => router.push("/hesap")} />
        </ListGroup>
      </ScrollScreen>
    </Screen>
  );
}
