import { FormScrollView } from "./FormScroll";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated, Dimensions, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "~/design/theme";
import { elevation, radius } from "~/design/tokens";
import { IconButton } from "./Button";
import { Text } from "./Text";

/**
 * Alt sayfa (bottom sheet). Oluşturma/düzenleme formları burada açılır:
 * bağlam kaybolmaz. İçerik kadar yükselir (en fazla %92); klavye açılınca
 * alt buton klavyenin üstüne çıkar.
 */
export function BottomSheet({
  visible, title, onClose, children, footer, scroll = true,
}: {
  visible: boolean; title?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; scroll?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const H = Dimensions.get("window").height;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    } else if (mounted) {
      Keyboard.dismiss();
      Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [H, 0] });

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={{ position: "absolute", inset: 0, backgroundColor: colors.bgScrim, opacity: progress }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Kapat" accessibilityRole="button" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Animated.View
            accessibilityViewIsModal
            style={[
              elevation.e3,
              {
                transform: [{ translateY }], maxHeight: H * 0.92, backgroundColor: colors.bgSurfaceRaised,
                borderTopLeftRadius: radius["2xl"], borderTopRightRadius: radius["2xl"], overflow: "hidden",
              },
            ]}
          >
            <View style={{ alignItems: "center", paddingTop: 8, height: 20 }}>
              <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong }} />
            </View>
            {title ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
                <Text variant="title2" style={{ flex: 1 }} accessibilityRole="header">{title}</Text>
                <IconButton icon="x" variant="tonal" size="S" label="Kapat" onPress={onClose} />
              </View>
            ) : null}
            {scroll ? (
              <FormScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 16 }}>
                {children}
              </FormScrollView>
            ) : (
              <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>{children}</View>
            )}
            {footer ? <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>{footer}</View> : null}
            <View style={{ height: Math.max(insets.bottom, 12) }} />
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
