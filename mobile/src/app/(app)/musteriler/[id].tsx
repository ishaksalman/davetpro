import { useState } from "react";
import { View } from "react-native";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { formatDate, formatMoney, formatPhone, whatsAppLink } from "@/lib/format";
import { useSessionContext } from "~/lib/auth/session";
import { useCustomerBalances, useCustomerReservations } from "~/lib/data/customers";
import { useLookups } from "~/lib/data/lookups";
import { Avatar } from "~/ui/Badge";
import { Button, IconButton } from "~/ui/Button";
import { EmptyState, ErrorState, RowSkeleton } from "~/ui/Feedback";
import { ListGroup, ListRow, SectionHeader } from "~/ui/List";
import { InlineHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { ReservationCard } from "~/features/cards";
import { CustomerSheet } from "~/features/customer-sheet";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canFinance } = useSessionContext();
  const lookups = useLookups();
  const balances = useCustomerBalances(canFinance);
  const res = useCustomerReservations(id);
  const [edit, setEdit] = useState(false);

  const customer = lookups.data?.customers.find((c) => c.id === id);
  const bal = balances.data?.get(id);
  const wa = whatsAppLink(customer?.phone);

  if (lookups.isError) return <Screen><InlineHeader title="Müşteri" /><ErrorState message={lookups.error instanceof Error ? lookups.error.message : undefined} onRetry={() => lookups.refetch()} /></Screen>;
  if (lookups.isLoading) return <Screen><InlineHeader title="Müşteri" /><ScrollScreen><ListGroup><RowSkeleton /><RowSkeleton /></ListGroup></ScrollScreen></Screen>;
  if (!customer) return <Screen><InlineHeader title="Müşteri" /><ScrollScreen><EmptyState title="Müşteri bulunamadı" description="Kayıt silinmiş ya da erişim yetkiniz yok." action={{ label: "Listeye dön", onPress: () => router.replace("/musteriler") }} /></ScrollScreen></Screen>;

  return (
    <Screen>
      <InlineHeader title="Müşteri" trailing={<Button label="Düzenle" variant="ghost" size="S" fullWidth={false} onPress={() => setEdit(true)} />} />
      <ScrollScreen onRefresh={() => { lookups.refetch(); res.refetch(); balances.refetch(); }} refreshing={res.isRefetching} bottomPad={40}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar name={customer.full_name} size="L" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="title1" numberOfLines={2}>{customer.full_name}</Text>
            {customer.contract_name && customer.contract_name !== customer.full_name ? <Text variant="footnote" color="textSecondary">Sözleşme: {customer.contract_name}</Text> : null}
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Button label="Ara" icon="phone" size="M" onPress={() => Linking.openURL(`tel:${customer.phone}`)} /></View>
          <IconButton icon="message-circle" variant="outline" label="WhatsApp ile yaz" disabled={!wa} onPress={() => wa && Linking.openURL(wa)} />
        </View>

        {canFinance ? (
          balances.isError ? (
            <ErrorState message={balances.error instanceof Error ? balances.error.message : undefined} onRetry={() => balances.refetch()} />
          ) : bal ? (
            <View style={{ gap: 10 }}>
              <SectionHeader title="Finans özeti" />
              <ListGroup>
                <ListRow title="Rezervasyon" value={String(bal.reservation_count)} />
                <ListRow title="Toplam satış" value={formatMoney(bal.total_sales)} />
                <ListRow title="Tahsil edilen" value={formatMoney(bal.total_paid)} />
                <ListRow title="Kalan bakiye" value={formatMoney(bal.total_balance)} />
              </ListGroup>
            </View>
          ) : null
        ) : null}

        <View style={{ gap: 10 }}>
          <SectionHeader title="Bilgiler" />
          <ListGroup>
            <ListRow icon="phone" title="Telefon" value={formatPhone(customer.phone)} onPress={() => Linking.openURL(`tel:${customer.phone}`)} />
            {customer.phone2 ? <ListRow icon="phone" title="Telefon 2" value={formatPhone(customer.phone2)} onPress={() => Linking.openURL(`tel:${customer.phone2}`)} /> : null}
            {customer.email ? <ListRow icon="mail" title="E-posta" value={customer.email} onPress={() => Linking.openURL(`mailto:${customer.email}`)} /> : null}
            {customer.address ? <ListRow icon="map-pin" title="Adres" subtitle={customer.address} /> : null}
            {customer.notes ? <ListRow icon="file-text" title="Notlar" subtitle={customer.notes} /> : null}
          </ListGroup>
        </View>

        <View style={{ gap: 10 }}>
          <SectionHeader title="Rezervasyonlar" action="Yeni" onAction={() => router.push("/rezervasyon/form")} />
          {res.isError ? (
            <ErrorState message={res.error instanceof Error ? res.error.message : undefined} onRetry={() => res.refetch()} />
          ) : res.isLoading ? (
            <ListGroup><RowSkeleton /><RowSkeleton /></ListGroup>
          ) : (res.data ?? []).length === 0 ? (
            <EmptyState title="Bu müşteriye ait rezervasyon yok" description={"İlk rezervasyonu oluşturmak için Yeni'ye dokunun."} />
          ) : (
            <View style={{ gap: 10 }}>
              {res.data!.map((r) => <ReservationCard key={r.id} row={r} onPress={() => router.push({ pathname: "/rezervasyon/[id]", params: { id: r.id } })} />)}
            </View>
          )}
        </View>
        <Text variant="caption" color="textTertiary" align="center">Kayıt: {formatDate(customer.created_at)}</Text>
      </ScrollScreen>
      <CustomerSheet visible={edit} customer={customer} onClose={() => setEdit(false)} />
    </Screen>
  );
}
