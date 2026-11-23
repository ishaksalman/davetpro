import { View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { fontFamily } from "~/design/typography";
import { Icon } from "~/ui/Icon";
import { Text } from "~/ui/Text";
import { Chip, GlassCard, O, white } from "./kit";

const big = (size: number, color: string = O.white) => ({ color, fontFamily: fontFamily.bold, fontSize: size, lineHeight: size + 6, letterSpacing: -size * 0.05 });

/** NOT: tüm rakamlar ve isimler örnek veridir; "Örnek veri" etiketiyle belirtilir. */

export function WelcomeHero() {
  return (
    <View style={{ height: 330 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <GlassCard style={{ position: "absolute", left: 0, top: 6, width: 270, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 48, paddingVertical: 8, borderRadius: 14, backgroundColor: O.blue, alignItems: "center" }}>
            <Text style={{ color: white(0.8), fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1.4 }}>CMT</Text>
            <Text style={big(22)}>31</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="headline" style={{ color: O.white }}>Ayşe & Mehmet</Text>
            <Text variant="caption" style={{ color: white(0.65) }}>Düğün · 19:00–23:30 · 350 kişi</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip label="Kapora alındı" icon="check" color={O.mintText} bg="rgba(25,179,126,0.25)" />
          <Chip label="Büyük Salon" />
        </View>
      </GlassCard>
      <GlassCard strong style={{ position: "absolute", left: 100, top: 148, width: 240, gap: 6 }}>
        <Text variant="caption" style={{ color: white(0.65) }}>Bu ay tahsilat</Text>
        <Text style={big(32)}>₺485.000</Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 5, height: 40 }}>
          {[14, 22, 18, 30, 24, 36, 40].map((h, i) => (
            <View key={i} style={{ width: 14, height: h, borderRadius: 4, backgroundColor: i === 6 ? O.mint : white(0.25) }} />
          ))}
        </View>
      </GlassCard>
      <View style={{ position: "absolute", left: 16, top: 288, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingLeft: 12, paddingRight: 14, borderRadius: 18, backgroundColor: O.navy2, borderWidth: 1, borderColor: "rgba(236,68,88,0.5)" }}>
        <Icon name="ban" size={16} color="inverseDanger" />
        <Text variant="subheadSemibold" style={{ color: O.white }}>Bu saatte kayıt var</Text>
      </View>
    </View>
  );
}

function Row({ children, bg, border, dashed }: { children: React.ReactNode; bg: string; border?: string; dashed?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, backgroundColor: bg, borderWidth: border ? 1 : 0, borderColor: border, borderStyle: dashed ? "dashed" : "solid" }}>
      {children}
    </View>
  );
}

export function ConflictHero() {
  return (
    <GlassCard style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="calendar" size={18} color="staticWhite" />
          <Text variant="subheadSemibold" style={{ color: O.white }}>31 Ekim · Cumartesi</Text>
        </View>
        <Chip label="Büyük Salon" />
      </View>
      <Row bg="rgba(61,116,255,0.22)">
        <View style={{ width: 4, height: 36, borderRadius: 2, backgroundColor: O.blue }} />
        <View>
          <Text variant="headline" style={{ color: O.white }}>Ayşe & Mehmet</Text>
          <Text variant="caption" style={{ color: white(0.7) }}>Düğün · 12:00–18:30</Text>
        </View>
      </Row>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 4 }}>
        <View style={{ width: 2, height: 14, borderRadius: 1, backgroundColor: white(0.35) }} />
        <Text variant="caption" style={{ color: white(0.7) }}>İki iş arasında en az 1 saat boşluk</Text>
      </View>
      <Row bg="rgba(236,68,88,0.14)" border="rgba(236,68,88,0.7)" dashed>
        <Icon name="ban" size={22} color="inverseDanger" />
        <View>
          <Text variant="headline" style={{ color: O.white }}>Yeni kayıt · 19:00</Text>
          <Text variant="caption" style={{ color: O.redText, fontFamily: fontFamily.semibold }}>Açılamaz, boşluk 30 dk</Text>
        </View>
      </Row>
      <Row bg="rgba(25,179,126,0.16)">
        <Icon name="check" size={22} color="inverseSuccess" strokeWidth={2.4} />
        <View>
          <Text variant="headline" style={{ color: O.white }}>Yeni kayıt · 19:30</Text>
          <Text variant="caption" style={{ color: O.mintText, fontFamily: fontFamily.semibold }}>Müsait</Text>
        </View>
      </Row>
    </GlassCard>
  );
}

export function CashHero() {
  const ledger: [string, string, string, boolean][] = [
    ["Kapora · havale", "+ ₺100.000", O.mint, false],
    ["2. taksit · nakit", "+ ₺200.000", O.mint, false],
    ["İptal · gerekçe: çift giriş", "₺20.000", O.redText, true],
  ];
  return (
    <View style={{ gap: 12 }}>
      <GlassCard style={{ padding: 20, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="footnoteMedium" style={{ color: white(0.65) }}>Kalan ödeme</Text>
          <Chip label="31 Ekim" icon="calendar" />
        </View>
        <Text style={big(40)}>₺125.000</Text>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: white(0.14), overflow: "hidden" }}>
          <View style={{ width: "70.6%", height: 8, borderRadius: 4, backgroundColor: O.mint }} />
        </View>
        <Text variant="caption" style={{ color: white(0.65) }}>₺300.000 tahsil edildi · toplam ₺425.000</Text>
      </GlassCard>
      <GlassCard style={{ paddingVertical: 4 }}>
        {ledger.map(([a, b, c, struck], i) => (
          <View key={a} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: white(0.1) }}>
            <Text variant="subheadSemibold" style={{ color: white(struck ? 0.5 : 0.9), flexShrink: 1 }}>{a}</Text>
            <Text variant="subheadSemibold" style={{ color: c, textDecorationLine: struck ? "line-through" : "none" }}>{b}</Text>
          </View>
        ))}
      </GlassCard>
      <Chip label="Kayıtlar silinmez, düzeltilmez" icon="lock" color={O.mintText} bg="rgba(22,224,180,0.14)" />
    </View>
  );
}

export function ProfitHero() {
  const vals = [44, 70, 52, 96, 62, 82, 110];
  const days = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  return (
    <View style={{ gap: 12 }}>
      <GlassCard style={{ padding: 20, gap: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ gap: 4 }}>
            <Text variant="footnoteMedium" style={{ color: white(0.65) }}>Ekim kârı</Text>
            <Text style={big(36)}>₺182.400</Text>
          </View>
          <Chip label="Örnek veri" />
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 110 }}>
          {vals.map((v, i) => (
            <View key={i} style={{ alignItems: "center", gap: 6 }}>
              <View style={{ width: 30, height: v - 18, borderRadius: 8, backgroundColor: i === 5 ? O.cyan : white(0.2) }} />
              <Text style={{ color: white(0.5), fontFamily: fontFamily.semibold, fontSize: 10 }}>{days[i]}</Text>
            </View>
          ))}
        </View>
      </GlassCard>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {([["Satış · organizasyon tarihine göre", "₺485.000", O.white], ["Tahsilat · işlem tarihine göre", "₺310.000", O.cyan]] as const).map(([cap, val, col]) => (
          <GlassCard key={cap} style={{ flex: 1, padding: 16, gap: 4, borderRadius: 22 }}>
            <Text variant="caption" style={{ color: white(0.65) }}>{cap}</Text>
            <Text style={big(20, col)}>{val}</Text>
          </GlassCard>
        ))}
      </View>
    </View>
  );
}

export function Hero({ kind }: { kind: "welcome" | "conflict" | "cash" | "profit" }) {
  return kind === "welcome" ? <WelcomeHero /> : kind === "conflict" ? <ConflictHero /> : kind === "cash" ? <CashHero /> : <ProfitHero />;
}
