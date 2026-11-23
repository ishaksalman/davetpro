import { useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { router } from "expo-router";
import { useTheme } from "~/design/theme";
import { useSessionContext, useAppSession } from "~/lib/auth/session";
import { useLookups } from "~/lib/data/lookups";
import { useGuideHidden, useReservationCount } from "~/lib/data/start-guide";
import { guideComplete, guideSteps, nextGuideStepId, type GuideStep } from "~/lib/domain/start-guide";
import { useRefetchOnFocus } from "~/lib/hooks";
import { Icon } from "~/ui/Icon";
import { Text } from "~/ui/Text";

/**
 * Yeni hesapların Anasayfa'sında başlangıç rehberi (web panelindeki "Başlangıç rehberi" ile aynı kurallar;
 * her işletme türü için: salon, fotoğrafçı, organizasyon). Adımlar kayıtlara bakılarak işaretlenir.
 * Yalnızca yönetici/sahip görür. Zorunlu adımlar bitince kendiliğinden kaybolur; veri okunamazsa hiç çıkmaz
 * (yanlış "yapılmadı" göstermek, göstermemekten kötüdür).
 */
export function StartGuide() {
  const { colors } = useTheme();
  const { isAdmin, vertical: v } = useSessionContext();
  const s = useAppSession();
  const lookups = useLookups();
  const count = useReservationCount(isAdmin);
  const { hidden, hide } = useGuideHidden();
  useRefetchOnFocus(() => { void lookups.refetch(); void count.refetch(); });

  if (!isAdmin || hidden !== false || !lookups.data || count.data === undefined) return null;

  const steps = guideSteps({
    business: s.business,
    venues: lookups.data.venues,
    packages: lookups.data.packages,
    reservationCount: count.data,
    usesResource: v.usesResource,
    resourceSingular: v.resource.singular,
  });
  if (guideComplete(steps)) return null;

  return <StartGuideCard steps={steps} onHide={hide} />;
}

const MINT = "#16E0B4";

/**
 * Sunum katmanı: veri ve gizleme tercihi dışarıdan gelir (geliştirme önizlemesi de bunu kullanır).
 * Kapalıyken tek satır: ilerleme halkası + sıradaki adım + ileri oku. Dokununca tüm adımlar açılır.
 * Kasıtlı olarak uygulamanın beyaz kartlarından ayrışır: nane tonlu zemin ve nane çerçeve.
 */
export function StartGuideCard({ steps, onHide }: { steps: GuideStep[]; onHide: () => void }) {
  const { colors, dark } = useTheme();
  const [open, setOpen] = useState(false);
  const doneCount = steps.filter((x) => x.done).length;
  const nextId = nextGuideStepId(steps);
  const next = steps.find((x) => x.id === nextId) ?? steps.find((x) => !x.done)!;

  return (
    <View style={{ borderRadius: 20, borderWidth: 1.5, borderColor: dark ? "rgba(22,224,180,0.45)" : "rgba(22,224,180,0.7)", backgroundColor: dark ? "rgba(22,224,180,0.08)" : "rgba(22,224,180,0.10)", overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 10 }}>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`Başlangıç rehberi, ${doneCount}/${steps.length} adım tamamlandı. ${next.title}. ${open ? "Adımları gizle" : "Tüm adımları göster"}`}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <Ring done={doneCount} total={steps.length} />
          <View style={{ flex: 1, gap: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text variant="captionSmall" color="textSecondary">BAŞLANGIÇ REHBERİ · {doneCount}/{steps.length}</Text>
              <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}><Icon name="chevron-down" size={12} color="textSecondary" strokeWidth={2.6} /></View>
            </View>
            <Text variant="subheadSemibold" numberOfLines={1}>{next.title}</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => router.push(next.route)}
          disabled={Boolean(next.blockedReason)}
          accessibilityRole="button"
          accessibilityLabel={next.blockedReason ?? next.actionLabel}
          accessibilityState={{ disabled: Boolean(next.blockedReason) }}
          hitSlop={6}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: next.blockedReason ? colors.bgSurfaceSunken : MINT }}
        >
          <Icon name="chevron-right" size={20} tint={next.blockedReason ? colors.textDisabled : "#0B1220"} strokeWidth={2.6} />
        </Pressable>
      </View>

      {open ? (
        <View style={{ borderTopWidth: 1, borderTopColor: dark ? "rgba(22,224,180,0.25)" : "rgba(22,224,180,0.4)", paddingHorizontal: 14, paddingVertical: 6 }}>
          {steps.map((step) => (
            <Pressable
              key={step.id}
              disabled={step.done || Boolean(step.blockedReason)}
              onPress={() => router.push(step.route)}
              accessibilityRole={step.done ? undefined : "button"}
              accessibilityLabel={`${step.title}${step.optional ? ", isteğe bağlı" : ""}. ${step.done ? "Tamamlandı" : step.blockedReason ?? "Yapılmadı"}`}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 }}
            >
              <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: step.done ? MINT : "transparent", borderWidth: step.done ? 0 : 1.5, borderColor: colors.borderStrong }}>
                {step.done ? <Icon name="check" size={12} tint="#0B1220" strokeWidth={3.2} /> : null}
              </View>
              <Text variant="footnote" color={step.done ? "textTertiary" : "textPrimary"} style={[{ flex: 1 }, step.done ? { textDecorationLine: "line-through" } : null]} numberOfLines={1}>
                {step.title}{step.optional && !step.done ? " · isteğe bağlı" : ""}
              </Text>
              {!step.done && !step.blockedReason ? <Icon name="chevron-right" size={14} color="textTertiary" /> : null}
            </Pressable>
          ))}
          <Pressable onPress={onHide} accessibilityRole="button" accessibilityLabel="Rehberi gizle" hitSlop={8} style={{ alignSelf: "flex-end", paddingVertical: 8 }}>
            <Text variant="caption" color="textTertiary">Rehberi gizle</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/** Adım ilerlemesi: nane halka, ortada tamamlanan/toplam. */
function Ring({ done, total }: { done: number; total: number }) {
  const { colors } = useTheme();
  const size = 40, stroke = 4, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessible={false}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.borderDefault} strokeWidth={stroke} fill="none" />
        {done > 0 ? <Circle cx={size / 2} cy={size / 2} r={r} stroke={MINT} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${(c * done) / total} ${c}`} /> : null}
      </Svg>
      <Text variant="captionSmall" style={{ fontWeight: "800" }}>{done}/{total}</Text>
    </View>
  );
}
