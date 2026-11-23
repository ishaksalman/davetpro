import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { useTheme } from "~/design/theme";
import { useSessionContext } from "~/lib/auth/session";
import { Icon, type IconName } from "~/ui/Icon";
import { Text } from "~/ui/Text";

/** Etkin sekme rengi: marka nanesi (web alt çubuğuyla aynı). */
const ACTIVE_FILL = "#16E0B4";

const TAB_ICON: Record<string, IconName> = {
  anasayfa: "house",
  takvim: "calendar-days",
  rezervasyonlar: "calendar-check",
  finans: "wallet",
  teslimat: "images",
  daha: "layout-grid",
};
const TAB_LABEL: Record<string, string> = {
  anasayfa: "Anasayfa",
  takvim: "Takvim",
  rezervasyonlar: "Rezervasyon",
  finans: "Finans",
  teslimat: "Teslimat",
  daha: "Daha",
};

/**
 * Figma "Tab Bar": 49 pt + ev göstergesi alanı. Aktif sekme hap zemin + koyu
 * ikon (renk tek başına değil). Finans yetkisi olmayan personelde Finans sekmesi
 * hiç yok (4 sekme) — aşağıda `href: null`.
 */
function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" style={{ backgroundColor: colors.bgSurfaceRaised, borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingBottom: insets.bottom }}>
      <View style={{ height: 49, flexDirection: "row", paddingHorizontal: 8 }}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          if ((options as { href?: unknown }).href === null) return null;
          const focused = state.index === index;
          const label = TAB_LABEL[route.name] ?? route.name;
          const onPress = () => {
            const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              style={{ flex: 1, alignItems: "center", paddingTop: 6, gap: 4 }}
            >
              {/* Web alt çubuğuyla aynı: etkin sekmede çizgi (kenar) pasifle aynı kalır, simgenin içi nane yeşiline dolar;
                  dolacak içi olmayan "Daha" simgesinde çizgi rengi nane olur. */}
              <View style={{ width: 56, height: 30, alignItems: "center", justifyContent: "center" }}>
                <Icon
                  name={TAB_ICON[route.name] ?? "house"}
                  size={24}
                  color="textTertiary"
                  strokeWidth={1.75}
                  fill={focused ? ACTIVE_FILL : undefined}
                />
              </View>
              <Text variant="labelTab" color={focused ? "textPrimary" : "textTertiary"} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { canFinance, vertical: v } = useSessionContext();
  // Fotoğrafçı (teslim akışı olan işletme): Teslimat sekmesi Finans'ın yerini alır; Finans Daha'dan açılır.
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="anasayfa" />
      <Tabs.Screen name="takvim" />
      <Tabs.Screen name="rezervasyonlar" />
      <Tabs.Screen name="teslimat" options={v.usesDelivery ? undefined : { href: null }} />
      <Tabs.Screen name="finans" options={canFinance && !v.usesDelivery ? undefined : { href: null }} />
      <Tabs.Screen name="daha" />
    </Tabs>
  );
}
