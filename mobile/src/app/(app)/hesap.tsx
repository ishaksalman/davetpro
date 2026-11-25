import { useState } from "react";
import { View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { env } from "~/lib/env";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { VERTICALS } from "@/lib/vertical";
import { useAppSession, useSessionContext } from "~/lib/auth/session";
import { Avatar, StatusBadge } from "~/ui/Badge";
import { Button } from "~/ui/Button";
import { ConfirmDialog } from "~/ui/Feedback";
import { ListGroup, ListRow, SectionHeader } from "~/ui/List";
import { InlineHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { PasswordSheet } from "~/features/settings-sheets";
import { DeleteAccountSheet } from "~/features/delete-account-sheet";

/**
 * Hesabım: profil (rol rozetiyle), işletme, abonelik, güvenlik, çıkış.
 * Rol burada YALNIZCA gösterilir; değiştirmek yöneticinin işidir (Ayarlar → Kullanıcılar)
 * ve yetkiyi RLS zorlar.
 */
export default function AccountScreen() {
  const s = useAppSession();
  const { signOut, isAdmin } = useSessionContext();
  const [pw, setPw] = useState(false);
  const [out, setOut] = useState(false);
  const [del, setDel] = useState(false);
  const sub = s.subscription;

  return (
    <Screen>
      <InlineHeader title="Hesabım" />
      <ScrollScreen bottomPad={40}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar name={s.profile.full_name} size="L" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="title1" numberOfLines={2}>{s.profile.full_name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text variant="footnote" color="textSecondary" numberOfLines={1} ellipsizeMode="tail" style={{ flexShrink: 1 }}>{s.user.email ?? ""}</Text>
              <View style={{ flexShrink: 0 }}><StatusBadge label={USER_ROLE_LABELS[s.profile.role]} tone={s.profile.role === "staff" ? "neutral" : "info"} size="S" /></View>
            </View>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <SectionHeader title="İşletme" action={isAdmin ? "Düzenle" : undefined} onAction={() => router.push("/ayarlar/isletme")} />
          <ListGroup>
            <ListRow icon="briefcase" title="İşletme" value={s.business.name} />
            <ListRow icon="tag" title="İşletme türü" value={VERTICALS[s.business.business_type].label} />
            {s.business.city ? <ListRow icon="map-pin" title="Şehir" value={s.business.city} /> : null}
          </ListGroup>
        </View>

        {sub ? (
          <View style={{ gap: 10 }}>
            <SectionHeader title="Hesap erişimi" />
            <ListGroup>
              <ListRow icon="calendar-clock" title="Erişim bitişi" value={formatDate(sub.accessUntil)} />
            </ListGroup>
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <SectionHeader title="Güvenlik" />
          <ListGroup>
            <ListRow icon="lock" title="Şifre değiştir" onPress={() => setPw(true)} />
          </ListGroup>
        </View>

        <View style={{ gap: 10 }}>
          <SectionHeader title="Yasal" />
          <ListGroup>
            <ListRow icon="file-text" title="Gizlilik Politikası" onPress={() => void Linking.openURL(env.privacyUrl)} />
            <ListRow icon="file-text" title="Kullanım Koşulları" onPress={() => void Linking.openURL(env.termsUrl)} />
          </ListGroup>
        </View>

        <View style={{ gap: 10 }}>
          <SectionHeader title="Hesap" />
          <ListGroup>
            <ListRow icon="trash" title="Hesabı sil" subtitle="Hesabınızı ve verilerinizi kalıcı olarak siler" onPress={() => setDel(true)} />
          </ListGroup>
        </View>

        <Button label="Çıkış yap" variant="outline" onPress={() => setOut(true)} />
      </ScrollScreen>
      <PasswordSheet visible={pw} onClose={() => setPw(false)} />
      <DeleteAccountSheet visible={del} onClose={() => setDel(false)} />
      <ConfirmDialog visible={out} title="Çıkış yapılsın mı?" message="Bu cihazdaki oturumunuz kapanır; verileriniz silinmez." confirmLabel="Çıkış yap" onCancel={() => setOut(false)} onConfirm={() => { setOut(false); void signOut(); }} />
    </Screen>
  );
}
