import type { ReactNode } from "react";
import { usePullRefresh } from "~/lib/hooks";
import { RefreshControl, ScrollView, View, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme } from "~/design/theme";
import { IconButton } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

/** Ekran zemini + üst güvenli alan. Alt güvenli alanı tab bar / içerik yönetir. */
export function Screen({ children, bottomInset = false }: { children: ReactNode; bottomInset?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas, paddingTop: insets.top, paddingBottom: bottomInset ? insets.bottom : 0 }}>
      {children}
    </View>
  );
}

export type HeaderAction = { icon: IconName; label: string; onPress: () => void };

/** Büyük başlık (sekme kök ekranı): sağda eylemler, altında Title/Large. */
export function LargeHeader({ title, actions = [] }: { title: string; actions?: HeaderAction[] }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, minHeight: 52, flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text variant="titleLarge" accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }}>{title}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {actions.map((a) => <IconButton key={a.label} icon={a.icon} label={a.label} onPress={a.onPress} />)}
      </View>
    </View>
  );
}

/** Satır içi (push) / modal navigasyon çubuğu. */
export function InlineHeader({
  title, back = true, backLabel = "Geri", trailing, onBack,
}: { title: string; back?: boolean; backLabel?: string; trailing?: ReactNode; onBack?: () => void }) {
  return (
    <View style={{ height: 44, flexDirection: "row", alignItems: "center", paddingHorizontal: 16 }}>
      <View style={{ width: 104, flexDirection: "row", alignItems: "center" }}>
        {back ? (
          <IconButton icon="chevron-left" variant="tonal" size="M" label={backLabel} onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))} />
        ) : null}
      </View>
      <Text variant="headline" align="center" numberOfLines={1} style={{ flex: 1 }} accessibilityRole="header">{title}</Text>
      <View style={{ width: 104, alignItems: "flex-end" }}>{trailing}</View>
    </View>
  );
}

/** Kaydırılabilir içerik: 16 pt yan boşluk, pull-to-refresh, klavye dokunuşu. */
export function ScrollScreen({
  children, onRefresh, bottomPad = 24, ...rest
}: ScrollViewProps & { children: ReactNode; onRefresh?: () => unknown; /** @deprecated artık yok sayılır; gösterge yalnızca çekince görünür */ refreshing?: boolean; bottomPad?: number }) {
  const pull = usePullRefresh(() => onRefresh?.());
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      refreshControl={onRefresh ? <RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} /> : undefined}
      {...rest}
      contentContainerStyle={[{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: bottomPad, gap: 20 }, rest.contentContainerStyle]}
    >
      {children}
    </ScrollView>
  );
}
