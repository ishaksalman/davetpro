import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "~/design/theme";
import { elevation, radius } from "~/design/tokens";
import type { Colors } from "~/design/tokens";
import { Button } from "./Button";
import { useErrorAnchor } from "./FormScroll";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

type BannerTone = "info" | "success" | "warning" | "danger" | "offline";
const BANNER: Record<BannerTone, { bg: keyof Colors; fg: keyof Colors; icon: IconName }> = {
  info: { bg: "feedbackInfoSubtle", fg: "feedbackOnInfoSubtle", icon: "info" },
  success: { bg: "feedbackSuccessSubtle", fg: "feedbackOnSuccessSubtle", icon: "circle-check" },
  warning: { bg: "feedbackWarningSubtle", fg: "feedbackOnWarningSubtle", icon: "clock" },
  danger: { bg: "feedbackDangerSubtle", fg: "feedbackOnDangerSubtle", icon: "circle-alert" },
  offline: { bg: "feedbackNeutralSubtle", fg: "feedbackOnNeutralSubtle", icon: "wifi-off" },
};

export function Banner({ tone, title, body, reveal = false }: { tone: BannerTone; title: string; body?: string; /** Görününce form kaydırılarak bantın görünür olması sağlanır (hata bantları). */ reveal?: boolean }) {
  const { colors } = useTheme();
  const anchor = useErrorAnchor(reveal, reveal);
  const t = BANNER[tone];
  return (
    <View ref={anchor} collapsable={false} accessibilityRole="alert" style={{ flexDirection: "row", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors[t.bg], alignItems: "flex-start" }}>
      <Icon name={t.icon} size={20} color={t.fg} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="subheadSemibold" style={{ color: colors[t.fg] }}>{title}</Text>
        {body ? <Text variant="footnote" color="textSecondary">{body}</Text> : null}
      </View>
    </View>
  );
}

function StateShell({ icon, tint, bg, title, description, action }: {
  icon: IconName; tint: keyof Colors; bg: keyof Colors; title: string; description: string;
  action?: { label: string; icon?: IconName; onPress: () => void };
}) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24, gap: 16 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors[bg], alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={30} color={tint} />
      </View>
      <View style={{ gap: 6, alignItems: "center" }}>
        <Text variant="title2" align="center">{title}</Text>
        <Text variant="subhead" color="textSecondary" align="center">{description}</Text>
      </View>
      {action ? <Button label={action.label} icon={action.icon} variant="secondary" size="M" fullWidth={false} onPress={action.onPress} /> : null}
    </View>
  );
}

export function EmptyState(props: { title: string; description: string; action?: { label: string; icon?: IconName; onPress: () => void } }) {
  return <StateShell icon="inbox" tint="textTertiary" bg="bgSurfaceSunken" {...props} />;
}

/** Sorgu hatası yutulmaz; para ekranlarında ₺0 yerine bu gösterilir. */
export function ErrorState({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
  return (
    <StateShell
      icon="cloud-off" tint="feedbackDanger" bg="feedbackDangerSubtle"
      title="Veriler yüklenemedi"
      description={message ?? "Tutarlar eksik görünmesin diye göstermiyoruz. Bağlantınızı kontrol edip tekrar deneyin."}
      action={onRetry ? { label: "Tekrar dene", icon: "rotate-ccw", onPress: onRetry } : undefined}
    />
  );
}

/** Satır / kart iskeleti: gerçek bileşenle aynı yükseklik; 1,2 sn nabız. */
export function Skeleton({ width, height, radius: r = radius.xs, style }: { width?: number | `${number}%`; height: number; radius?: number; style?: object }) {
  const { colors } = useTheme();
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 0.5, duration: 600, useNativeDriver: true }),
      Animated.timing(v, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: width ?? "100%", height, borderRadius: r, backgroundColor: colors.bgSurfaceSunken, opacity: v }, style]} />;
}

export function CardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 14, padding: 16, borderRadius: radius.xl, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle, height: 110 }}>
      <Skeleton width={52} height={76} radius={radius.md} />
      <View style={{ flex: 1, gap: 10 }}>
        <Skeleton width={170} height={14} />
        <Skeleton width={220} height={10} />
        <Skeleton width={110} height={10} />
      </View>
    </View>
  );
}

export function RowSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16, height: 60, backgroundColor: colors.bgSurface }}>
      <Skeleton width={36} height={36} radius={18} />
      <View style={{ flex: 1, gap: 8 }}><Skeleton width={150} height={12} /><Skeleton width={96} height={10} /></View>
      <Skeleton width={64} height={12} />
    </View>
  );
}

// --- Toast -------------------------------------------------------------------

type ToastTone = "success" | "danger" | "info";
type ToastItem = { id: number; tone: ToastTone; message: string; action?: { label: string; onPress: () => void } };
const ToastContext = createContext<(t: Omit<ToastItem, "id">) => void>(() => {});
export const useToast = () => useContext(ToastContext);

const TOAST_ICON: Record<ToastTone, { icon: IconName; color: keyof Colors }> = {
  success: { icon: "circle-check", color: "inverseSuccess" },
  danger: { icon: "circle-alert", color: "inverseDanger" },
  info: { icon: "info", color: "inverseInfo" },
};

/** Altta, tab bar'ın 12 pt üstünde. 4 sn (eylemliyse 6 sn). */
export function ToastProvider({ children, bottomOffset = 0 }: { children: ReactNode; bottomOffset?: number }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const show = useCallback((t: Omit<ToastItem, "id">) => {
    if (timer.current) clearTimeout(timer.current);
    const id = ++seq.current;
    setToast({ ...t, id });
    timer.current = setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), t.action ? 6000 : 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 49 + 12 + bottomOffset }}>
          <View
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[elevation.e2, { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.bgInverse }]}
          >
            <Icon name={TOAST_ICON[toast.tone].icon} size={20} color={TOAST_ICON[toast.tone].color} />
            <Text variant="subheadSemibold" color="textInverse" style={{ flex: 1 }}>{toast.message}</Text>
            {toast.action ? (
              <Pressable hitSlop={12} onPress={() => { toast.action?.onPress(); setToast(null); }}>
                <Text variant="subheadSemibold" color="inverseLink">{toast.action.label}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

// --- Diyalog -----------------------------------------------------------------

/** Yalnızca geri dönüşü olmayan kararlar için. Güvenli seçenek en altta. */
export function ConfirmDialog({
  visible, title, message, confirmLabel, destructive, loading, onConfirm, onCancel, children,
}: {
  visible: boolean; title: string; message?: string; confirmLabel: string; destructive?: boolean;
  loading?: boolean; onConfirm: () => void; onCancel: () => void; children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.bgScrim, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View accessibilityViewIsModal style={[elevation.dialog, { width: "100%", maxWidth: 340, padding: 24, gap: 20, borderRadius: radius.xl, backgroundColor: colors.bgSurfaceRaised, alignItems: "center" }]}>
          <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: destructive ? colors.feedbackDangerSubtle : colors.feedbackInfoSubtle }}>
            <Icon name={destructive ? "triangle-alert" : "info"} size={24} color={destructive ? "feedbackDanger" : "feedbackInfo"} />
          </View>
          <View style={{ gap: 8, alignItems: "center", alignSelf: "stretch" }}>
            <Text variant="title2" align="center">{title}</Text>
            {message ? <Text variant="subhead" color="textSecondary" align="center">{message}</Text> : null}
          </View>
          {children ? <View style={{ alignSelf: "stretch" }}>{children}</View> : null}
          <View style={{ gap: 8, alignSelf: "stretch" }}>
            <Button label={confirmLabel} variant={destructive ? "destructive" : "primary"} loading={loading} onPress={onConfirm} />
            <Button label="Vazgeç" variant="secondary" disabled={loading} onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
