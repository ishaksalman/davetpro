import { Pressable, View } from "react-native";
import { VERTICALS } from "@/lib/vertical";
import type { BusinessType } from "@/lib/database.types";
import { useTheme } from "~/design/theme";
import { radius } from "~/design/tokens";
import { Icon, type IconName } from "~/ui/Icon";
import { Text } from "~/ui/Text";

const ICON: Record<BusinessType, IconName> = { salon: "building", fotografci: "camera", organizasyon: "users" };

/** İşletme türü seçim kartı: kayıt ve işletme kurulumu aynı kartı kullanır. */
export function BusinessTypeCard({ type, selected, onPress }: { type: BusinessType; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const v = VERTICALS[type];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${v.label}. ${v.description}`}
      onPress={onPress}
      style={{
        flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: radius.xl, backgroundColor: colors.bgSurface,
        borderWidth: selected ? 2 : 1, borderColor: selected ? colors.actionPrimary : colors.borderDefault,
      }}
    >
      <View style={{ width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.actionPrimary : colors.actionSecondary }}>
        <Icon name={ICON[type]} size={22} color={selected ? "actionOnPrimary" : "iconPrimary"} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="headline">{v.label}</Text>
        <Text variant="footnote" color="textSecondary">{v.description}</Text>
      </View>
      <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.actionPrimary : "transparent", borderWidth: selected ? 0 : 1.5, borderColor: colors.borderStrong }}>
        {selected ? <Icon name="check" size={14} color="actionOnPrimary" strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

