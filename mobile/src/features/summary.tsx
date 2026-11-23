import { View } from "react-native";
import { useTheme } from "~/design/theme";
import { radius } from "~/design/tokens";
import { formatDate, formatMoney } from "@/lib/format";
import { todayISO } from "@/lib/time";
import { collectedPercent } from "~/lib/data/rows";
import type { ReservationRow } from "~/lib/data/types";
import { paymentState } from "~/lib/domain/status";
import { StatusBadge } from "~/ui/Badge";
import { Icon } from "~/ui/Icon";
import { Progress } from "~/ui/List";
import { Text } from "~/ui/Text";

/**
 * Finans özeti (Figma "Payment Summary"). Yalnızca finans yetkisi olan kullanıcıda
 * çizilir (çağıran kontrol eder). Kalan bakiye kırmızı değildir.
 */
export function PaymentSummary({ row }: { row: ReservationRow }) {
  const { colors } = useTheme();
  const state = paymentState(row, todayISO());
  const hasDue = row.due_date && row.balance_amount > 0;
  return (
    <View style={{ padding: 20, gap: 16, borderRadius: radius.xl, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="title2">Ödeme durumu</Text>
        {state ? <StatusBadge label={state.label} tone={state.tone} /> : null}
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Figure label="Sözleşme" value={formatMoney(row.net_amount)} />
        <Figure label="Tahsil edilen" value={formatMoney(row.collected_amount)} color="moneyIncome" />
        <Figure label="Kalan" value={formatMoney(row.balance_amount)} color="moneyOutstanding" />
      </View>
      <Progress value={collectedPercent(row.net_amount, row.collected_amount)} />
      {hasDue ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="calendar-clock" size={16} color="iconSecondary" />
          <Text variant="footnote" color="textSecondary">Kalan ödeme tarihi {formatDate(row.due_date)} · {formatMoney(row.balance_amount)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Figure({ label, value, color = "textPrimary" }: { label: string; value: string; color?: "textPrimary" | "moneyIncome" | "moneyOutstanding" }) {
  return (
    <View style={{ flex: 1, gap: 4 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="footnote" color="textSecondary">{label}</Text>
      <Text variant="numericM" color={color} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}
