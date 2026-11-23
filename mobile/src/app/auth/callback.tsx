import { ActivityIndicator, View } from "react-native";
import { useTheme } from "~/design/theme";
import { Text } from "~/ui/Text";

/**
 * davetpro://auth/callback ve https://<web>/auth/callback bağlantılarının indiği
 * yer. Asıl işlem kök yerleşimdeki dinleyicide (handleAuthUrl); burası yalnızca
 * "bulunamadı" ekranı çıkmasın diye var ve oturum durumu değişince Gate yönlendirir.
 */
export default function AuthCallback() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.bgCanvas }}>
      <ActivityIndicator />
      <Text variant="subhead" color="textSecondary">Bağlantı doğrulanıyor…</Text>
    </View>
  );
}
