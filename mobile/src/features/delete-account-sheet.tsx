import { useState } from "react";
import { View } from "react-native";
import { useAppSession, useSessionContext } from "~/lib/auth/session";
import { deleteMyAccount } from "~/lib/auth/delete-account";
import { useOnline, useSubmitGuard } from "~/lib/hooks";
import { Banner } from "~/ui/Feedback";
import { Button } from "~/ui/Button";
import { TextField } from "~/ui/Inputs";
import { BottomSheet } from "~/ui/Sheet";
import { Text } from "~/ui/Text";

const WORD = "SİL";

/**
 * Hesabı sil (mağaza gereksinimi). Geri alınamaz: kullanıcı "SİL" yazmadan düğme açılmaz.
 * Mesaj role göre: işletme sahibinde işletme verisinin de gideceği açıkça yazılır.
 */
export function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} title="Hesabı sil" onClose={onClose}>
      <DeleteForm />
    </BottomSheet>
  );
}

function DeleteForm() {
  const s = useAppSession();
  const { signOut } = useSessionContext();
  const online = useOnline();
  const guard = useSubmitGuard();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const owner = s.profile.role === "owner";
  const confirmed = text.trim().toLocaleUpperCase("tr-TR") === WORD;

  const run = () =>
    guard.run(async () => {
      setError(null);
      const r = await deleteMyAccount();
      if (!r.ok) return setError(r.error);
      await signOut(); // hesap artık yok: yerel oturum temizlenir, giriş ekranına dönülür
    });

  return (
    <View style={{ gap: 16 }}>
      {error ? <Banner reveal tone="danger" title="Hesap silinemedi" body={error} /> : null}
      {!online ? <Banner tone="offline" title="Çevrimdışısınız" body="Hesabı silmek için internet bağlantısı gerekli." /> : null}
      <View style={{ gap: 8 }}>
        <Text variant="body">
          {owner
            ? `Hesabınız ve "${s.business.name}" işletmesi kalıcı olarak silinir: müşteriler, rezervasyonlar, tahsilat ve giderler, talepler, teklifler ve sözleşmeler dahil tüm veriler.`
            : "Hesabınız kalıcı olarak silinir. İşletmenin verileri (müşteriler, rezervasyonlar vb.) durur; yalnızca sizin erişiminiz kalkar."}
        </Text>
        <Text variant="footnote" color="textSecondary">Bu işlem geri alınamaz. {owner ? "İşletmede başka kullanıcı varsa önce onları Ayarlar → Kullanıcılar bölümünden kaldırmanız gerekir." : ""}</Text>
      </View>
      <TextField label={`Onaylamak için "${WORD}" yazın`} value={text} onChangeText={setText} autoCapitalize="characters" autoCorrect={false} placeholder={WORD} />
      <Button label="Hesabımı kalıcı olarak sil" variant="destructive" loading={guard.pending} disabled={!confirmed || !online} onPress={() => void run()} />
    </View>
  );
}
