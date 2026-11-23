import { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { initials } from "@/lib/format";
import { useTheme } from "~/design/theme";
import { Text } from "./Text";

/**
 * İşletme logosu (`businesses.logo_url`, herkese açık `logos` deposu). Logo yoksa ya da
 * yüklenemezse işletme adının baş harfleriyle yer tutucu çıkar; ekran bozulmaz.
 */
export function BusinessLogo({ uri, name, size = 64 }: { uri?: string | null; name: string; size?: number }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const show = !!uri && !failed;
  const radius = Math.round(size * 0.28);
  return (
    <View
      accessible
      accessibilityLabel={`${name} logosu`}
      style={{
        width: size, height: size, borderRadius: radius, overflow: "hidden", alignItems: "center", justifyContent: "center",
        backgroundColor: show ? "#FFFFFF" : colors.actionAccentSubtle, borderWidth: 1, borderColor: colors.borderSubtle,
      }}
    >
      {show ? (
        <Image source={{ uri: uri! }} style={{ width: size - 12, height: size - 12 }} contentFit="contain" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
      ) : (
        <Text variant={size >= 56 ? "title2" : "subheadSemibold"} color="textLink">{initials(name) || "?"}</Text>
      )}
    </View>
  );
}
