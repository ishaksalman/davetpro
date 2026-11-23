import { Pressable, View } from "react-native";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { useTheme } from "~/design/theme";
import { radius } from "~/design/tokens";
import { monthGrid, shiftMonth, WEEKDAY_HEADS } from "~/lib/domain/calendar";
import { todayISO } from "@/lib/time";
import { IconButton } from "./Button";
import { Text } from "./Text";

/**
 * Ay görünümü. Günün altındaki noktalar o günkü işlerin salon renkleridir
 * (en fazla 3). Bugün mavi rakam, seçili gün dolu daire.
 */
export function MonthCalendar({
  month, onMonthChange, selected, onSelect, dots, minDate,
}: {
  month: string; onMonthChange: (monthISO: string) => void;
  selected?: string | null; onSelect: (iso: string) => void;
  dots?: Record<string, string[]>; minDate?: string;
}) {
  const { colors } = useTheme();
  const today = todayISO();
  const weeks = monthGrid(month);
  const m = parseISO(month).getMonth();
  const title = format(parseISO(month), "LLLL yyyy", { locale: tr });

  return (
    <View style={{ paddingTop: 12, paddingHorizontal: 5, paddingBottom: 8, gap: 4, borderRadius: radius.xl, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 12, paddingRight: 4, paddingBottom: 4 }}>
        <Text variant="title2" accessibilityRole="header">{title.charAt(0).toLocaleUpperCase("tr-TR") + title.slice(1)}</Text>
        <View style={{ flexDirection: "row", gap: 4 }}>
          <IconButton icon="chevron-left" size="M" label="Önceki ay" onPress={() => onMonthChange(shiftMonth(month, -1))} />
          <IconButton icon="chevron-right" size="M" label="Sonraki ay" onPress={() => onMonthChange(shiftMonth(month, 1))} />
        </View>
      </View>
      <View style={{ flexDirection: "row" }}>
        {WEEKDAY_HEADS.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: "center" }}><Text variant="caption" color="textTertiary">{d}</Text></View>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]} style={{ flexDirection: "row" }}>
          {week.map((iso) => {
            const d = parseISO(iso);
            const outside = d.getMonth() !== m;
            const isSel = iso === selected;
            const isToday = iso === today;
            const disabled = !!minDate && iso < minDate;
            const colorsForDay = dots?.[iso] ?? [];
            const shown = colorsForDay.slice(0, 3);
            return (
              <Pressable
                key={iso}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={format(d, "d MMMM EEEE", { locale: tr }) + (colorsForDay.length ? `, ${colorsForDay.length} iş` : "")}
                accessibilityState={{ selected: isSel, disabled }}
                onPress={() => onSelect(iso)}
                style={{ flex: 1, height: 50, alignItems: "center", gap: 3, paddingVertical: 4, opacity: disabled ? 0.35 : 1 }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: isSel ? colors.actionPrimary : "transparent" }}>
                  <Text
                    variant={isSel || isToday ? "subheadSemibold" : "subhead"}
                    style={{ color: isSel ? colors.actionOnPrimary : isToday ? colors.textLink : outside ? colors.textDisabled : colors.textPrimary }}
                  >
                    {d.getDate()}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 3, height: 5 }}>
                  {shown.map((c, i) => (
                    <View key={i} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: c, opacity: outside ? 0.4 : 1 }} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
