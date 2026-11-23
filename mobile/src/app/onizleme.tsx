import { Redirect } from "expo-router";
import { View } from "react-native";
import { SessionContext, type SessionContextValue } from "~/lib/auth/session";
import { vertical } from "@/lib/vertical";
import type { BusinessType } from "@/lib/database.types";
import type { ReservationRow } from "~/lib/data/types";
import { useState } from "react";
import { ScrollView } from "react-native";
import { useTheme } from "~/design/theme";
import { Avatar, CountBadge, StatusBadge, VenueTag } from "~/ui/Badge";
import { Button, Fab, IconButton } from "~/ui/Button";
import { Banner, EmptyState, ErrorState, RowSkeleton } from "~/ui/Feedback";
import { FilterChip, MoneyField, SearchBar, SegmentedControl, TextField } from "~/ui/Inputs";
import { ListGroup, ListRow, SectionHeader } from "~/ui/List";
import { MonthCalendar } from "~/ui/MonthCalendar";
import { Text } from "~/ui/Text";
import { PaymentSummary } from "~/features/summary";
import { ReservationCard, StatCard, TransactionRow } from "~/features/cards";
import { AgendaEvent } from "~/features/agenda";
import { HeroCard, MonthWeekCard, OccupancyCard } from "~/features/dashboard-widgets";
import { InlineHeader } from "~/ui/Screen";
import { BrandLogo } from "~/ui/Brand";
import { StartGuideCard } from "~/features/onboarding/start-guide";
import { guideSteps } from "~/lib/domain/start-guide";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * YALNIZCA GELİŞTİRME (`__DEV__`): arayüz kitinin Figma ile görsel karşılaştırması.
 * Uydurma veri yalnızca bu rotada vardır; üretim derlemesinde rota "/"a yönlendirir
 * ve uygulamanın hiçbir gerçek ekranı örnek veri göstermez.
 */
const row = (o: Partial<ReservationRow> = {}): ReservationRow => ({
  id: "r1", business_id: "b", venue_id: "v1", customer_id: "c1", package_id: null, organization_type: "dugun", status: "kesinlesti",
  event_date: "2026-10-17", start_time: "19:00:00", end_time: "23:30:00", guest_count: 350, location: null, team_id: null, venue_allows_overlap: false,
  delivery_status: null, delivered_at: null, delivery_due_date: null, delivery_link: null, notes: null, created_by: null, starts_at: "", ends_at: "",
  created_at: "", updated_at: "", pricing: null, items: [], customer: { id: "c1", full_name: "Ayşe & Mehmet", phone: "0532 111 22 33" },
  venue: { id: "v1", name: "Kristal Salon", color: "#6366f1" }, team: null, package: null,
  net_amount: 120000, collected_amount: 70000, balance_amount: 50000, expense_amount: 0, profit_amount: 0, profit_margin: null, due_date: "2026-11-15", unit_price: null, ...o,
});

function fakeSession(type: BusinessType, canFinance: boolean): SessionContextValue {
  return {
    state: { status: "loading" }, passwordSetupPending: false, setPasswordSetupPending: () => {}, vertical: vertical(type), canFinance, isAdmin: true,
    signIn: async () => ({ ok: true }), signOut: async () => {}, reload: async () => {},
  };
}

export default function Preview() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<BusinessType>("salon");
  const [finance, setFinance] = useState(true);
  const [seg, setSeg] = useState("ay");
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <SessionContext.Provider value={fakeSession(type, finance)}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bgCanvas }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: 80, gap: 20 }}>
        <InlineHeader title="Rezervasyon" onBack={() => {}} />
        <BrandLogo />
        <Text variant="titleLarge">Önizleme (yalnızca geliştirme)</Text>
        <SegmentedControl options={[{ value: "salon", label: "Salon" }, { value: "fotografci", label: "Fotoğrafçı" }, { value: "organizasyon", label: "Org." }]} value={type} onChange={setType} />
        <StartGuideCard
          onHide={() => {}}
          steps={guideSteps({
            business: { phone: null, address: null },
            venues: type === "salon" ? [] : [{ is_active: true, allows_overlap: true, name: type === "fotografci" ? "Diğer" : "Dış mekân" }],
            packages: [], reservationCount: 0, usesResource: vertical(type).usesResource, resourceSingular: vertical(type).resource.singular,
          })}
        />
        <SegmentedControl options={[{ value: "evet", label: "Finans görür" }, { value: "hayir", label: "Finans yok" }]} value={finance ? "evet" : "hayir"} onChange={(v) => setFinance(v === "evet")} />
        <HeroCard label="Bu ay tahsilat" value="₺485.000" trend={{ percent: 12, direction: "up", label: "" }} series={[{ label: "May", value: 300 }, { label: "Haz", value: 380 }, { label: "Tem", value: 500 }, { label: "Ağu", value: 450 }, { label: "Eyl", value: 360 }, { label: "Eki", value: 485 }]} footLabel="Bekleyen alacak" footValue="₺1.240.000" foot2Label="Bekleyen" foot2Value="18 organizasyon" />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <MonthWeekCard count={14} unit="organizasyon" months={[{ label: "May", count: 6 }, { label: "Haz", count: 9 }, { label: "Tem", count: 12 }, { label: "Ağu", count: 7 }, { label: "Eyl", count: 10 }, { label: "Eki", count: 14 }]} />
          <OccupancyCard percent={78} trend={{ percent: 20, direction: "up", label: "Geçen aya göre %20 artış" }} />
        </View>
        <SectionHeader title="Bugün · 2 organizasyon" action="Takvim" />
        <ReservationCard row={row()} onPress={() => {}} />
        <ReservationCard row={row({ id: "r2", customer: { id: "c2", full_name: "Zeynep & Can", phone: "" }, venue: { id: "v3", name: "Teras", color: "#14b8a6" }, organization_type: "nisan", guest_count: 120, collected_amount: 45000, net_amount: 45000, balance_amount: 0 })} onPress={() => {}} />
        <PaymentSummary row={row()} />
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <View style={{ flex: 1 }}><Button label="Tahsilat ekle" icon="plus" size="M" onPress={() => {}} /></View>
          <IconButton icon="phone" variant="outline" label="Ara" /><IconButton icon="message-circle" variant="outline" label="WhatsApp" />
        </View>
        <SectionHeader title="Ödemeler" action="Tümü" />
        <ListGroup>
          <TransactionRow kind="income" title="Ara ödeme" meta="Kredi kartı · 01.10.2026" amount={45000} />
          <TransactionRow kind="income" title="Kapora" meta="Havale / EFT · 08.09.2026" amount={25000} />
          <TransactionRow kind="income" title="Kapora (mükerrer)" meta="Havale / EFT · 08.09.2026" amount={10000} voided voidReason="mükerrer" />
        </ListGroup>
        <SectionHeader title="Bilgiler" />
        <ListGroup>
          <ListRow icon="clock" title="Saat" value="19:00–23:30" />
          <ListRow icon="map-pin" title="Salon" value="Kristal Salon" />
          <ListRow icon="users" title="Kişi sayısı" value="350" />
          <ListRow icon="package" title="Paket" value="Gold Paket" />
        </ListGroup>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge label="Oluşturuldu" tone="success" /><StatusBadge label="Tamamlandı" tone="info" /><StatusBadge label="Opsiyonlu" tone="warning" />
          <StatusBadge label="İptal edildi" tone="danger" /><StatusBadge label="Teklif verildi" tone="violet" /><StatusBadge label="Taslak" tone="neutral" size="S" />
          <Avatar name="İshak Salman" /><CountBadge count={3} /><VenueTag name="Kristal Salon" color="#6366f1" />
        </View>
        <SearchBar value="" onChangeText={() => {}} placeholder="Ad, telefon veya tarih ara" />
        <View style={{ flexDirection: "row", gap: 8 }}><FilterChip label="Yaklaşan" selected onPress={() => {}} /><FilterChip label="Bu ay" count={12} onPress={() => {}} /><FilterChip label="Geçmiş" onPress={() => {}} /></View>
        <SegmentedControl options={[{ value: "ay", label: "Ay" }, { value: "hafta", label: "Hafta" }, { value: "liste", label: "Liste" }]} value={seg} onChange={setSeg} />
        <MonthCalendar month="2026-10-01" onMonthChange={() => {}} selected="2026-10-17" onSelect={() => {}} dots={{ "2026-10-10": ["#6366f1", "#ec4899", "#14b8a6"], "2026-10-17": ["#6366f1", "#ec4899"], "2026-10-04": ["#f59e0b"] }} />
        <AgendaEvent item={{ kind: "reservation", key: "a", date: "2026-10-17", start: "13:00", end: "16:00", row: row({ venue: { id: "v2", name: "Bahçe", color: "#ec4899" }, customer: { id: "c", full_name: "Selin & Arda", phone: "" }, organization_type: "kina", guest_count: 180 }) }} />
        <AgendaEvent item={{ kind: "reservation", key: "b", date: "2026-10-17", start: "19:00", end: "23:30", row: row() }} />
        <TextField label="Ad soyad" icon="user" placeholder="Örn. Ayşe Yılmaz" helper="Sözleşmede bu ad yazılır." value="" onChangeText={() => {}} />
        <TextField label="Ad soyad" icon="user" value="" onChangeText={() => {}} error="Ad soyad zorunlu." />
        <MoneyField value={25000} onChange={() => {}} hint="Kalan bakiye ₺50.000" />
        <Banner tone="warning" title="Vadesi geçmiş ödeme" body="₺25.000 · 3 gün gecikti" />
        <Banner tone="offline" title="Çevrimdışısınız" body="Son güncelleme 14:32. Kayıt eklemek için bağlantı gerekli." />
        <ListGroup><RowSkeleton /><RowSkeleton /></ListGroup>
        <EmptyState title="Henüz talep yok" description="Telefon, Instagram veya web formundan gelen talepler burada toplanır." action={{ label: "Talep ekle", icon: "plus", onPress: () => {} }} />
        <ErrorState onRetry={() => {}} />
        <Fab label="Yeni rezervasyon" onPress={() => {}} />
        <Button label="Sil" variant="destructive" onPress={() => {}} />
        <Button label="Vazgeç" variant="secondary" onPress={() => {}} />
        <Button label="Yükleniyor" loading onPress={() => {}} />
      </ScrollView>
    </SessionContext.Provider>
  );
}
