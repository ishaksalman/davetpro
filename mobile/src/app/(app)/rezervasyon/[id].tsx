import { useState } from "react";
import { View } from "react-native";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import {
  DELIVERY_STATUS_LABELS, INCOME_CATEGORY_LABELS, ORGANIZATION_TYPE_LABELS, PAYMENT_METHOD_LABELS,
  RESERVATION_STATUS_FLOW, RESERVATION_STATUS_LABELS,
} from "@/lib/constants";
import { formatDate, formatDateLong, formatMoney, formatNumber, formatPercent, formatPhone, formatTime, whatsAppLink } from "@/lib/format";
import { STAGE_FLOW, STAGES, type Stage } from "@/lib/stage";
import { useSessionContext } from "~/lib/auth/session";
import { useExpenseCategories, useExpenses, usePayments } from "~/lib/data/finance";
import { useReservation, useUpdateStage, useUpdateStatus } from "~/lib/data/reservations";
import { reservationBadge } from "~/lib/domain/status";
import { useRefetchOnFocus, useSubmitGuard } from "~/lib/hooks";
import { StatusBadge } from "~/ui/Badge";
import { Button, IconButton } from "~/ui/Button";
import { Banner, ConfirmDialog, EmptyState, ErrorState, RowSkeleton, Skeleton, useToast } from "~/ui/Feedback";
import { ListGroup, ListRow, SectionHeader } from "~/ui/List";
import { InlineHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { BottomSheet } from "~/ui/Sheet";
import { Text } from "~/ui/Text";
import { TransactionRow } from "~/features/cards";
import { ExpenseSheet, PaymentSheet, VoidDialog } from "~/features/finance-sheets";
import { PaymentSummary } from "~/features/summary";
import { DeliverySheet } from "~/features/delivery-sheet";
import { useTheme } from "~/design/theme";
import { Icon } from "~/ui/Icon";

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const toast = useToast();
  const { vertical: v, canFinance } = useSessionContext();
  const q = useReservation(id);
  const payments = usePayments(id, canFinance);
  const expenses = useExpenses(id, canFinance);
  const categories = useExpenseCategories(canFinance);
  useRefetchOnFocus(() => { q.refetch(); payments.refetch(); expenses.refetch(); });

  const updateStatus = useUpdateStatus(id);
  const updateStage = useUpdateStage(id);
  const guard = useSubmitGuard();

  const [menu, setMenu] = useState(false);
  const [paySheet, setPaySheet] = useState(false);
  const [expSheet, setExpSheet] = useState(false);
  const [cancelAsk, setCancelAsk] = useState(false);
  const [deliverySheet, setDeliverySheet] = useState(false);
  const [voidTarget, setVoidTarget] = useState<{ kind: "payments" | "expenses"; id: string } | null>(null);
  const [voidMenu, setVoidMenu] = useState<{ kind: "payments" | "expenses"; id: string } | null>(null);

  const row = q.data;

  const header = (
    <InlineHeader
      title="Rezervasyon"
      trailing={row ? <IconButton icon="ellipsis" label="Diğer işlemler" onPress={() => setMenu(true)} /> : undefined}
    />
  );

  if (q.isLoading) {
    return (
      <Screen>{header}
        <ScrollScreen><Skeleton height={24} width={100} /><Skeleton height={28} width={200} /><Skeleton height={182} radius={20} /><RowSkeleton /><RowSkeleton /></ScrollScreen>
      </Screen>
    );
  }
  if (q.isError) {
    return <Screen>{header}<ScrollScreen><ErrorState message={q.error instanceof Error ? q.error.message : undefined} onRetry={() => q.refetch()} /></ScrollScreen></Screen>;
  }
  if (!row) {
    return <Screen>{header}<ScrollScreen><EmptyState title="Kayıt bulunamadı" description="Bu rezervasyon silinmiş ya da erişim yetkiniz yok." action={{ label: "Listeye dön", onPress: () => router.replace("/rezervasyonlar") }} /></ScrollScreen></Screen>;
  }

  const badge = reservationBadge(row, v);
  const typeLabel = ORGANIZATION_TYPE_LABELS[row.organization_type];
  const phone = row.customer?.phone ?? null;
  const wa = whatsAppLink(phone);
  const catName = new Map((categories.data ?? []).map((c) => [c.id, c.name] as const));
  const paymentRows = payments.data ?? [];
  const expenseRows = expenses.data ?? [];
  const cancelled = row.status === "iptal_edildi";

  const run = (fn: () => Promise<unknown>, ok: string) =>
    guard.run(async () => {
      try {
        await fn();
        toast({ tone: "success", message: ok });
        setMenu(false);
      } catch (e) {
        toast({ tone: "danger", message: e instanceof Error ? e.message : "İşlem yapılamadı." });
      }
    });

  return (
    <Screen>
      {header}
      <ScrollScreen onRefresh={() => { q.refetch(); payments.refetch(); expenses.refetch(); }} refreshing={q.isRefetching} bottomPad={40}>
        <View style={{ gap: 8, paddingTop: 8 }}>
          <StatusBadge label={badge.label} tone={badge.tone} />
          <Text variant="title1" accessibilityRole="header">{row.customer?.full_name ?? "—"}</Text>
          <Text variant="subhead" color="textSecondary">{typeLabel} · {formatDateLong(row.event_date)}</Text>
        </View>

        {canFinance && row.net_amount > 0 ? <PaymentSummary row={row} /> : null}
        {canFinance && row.net_amount <= 0 ? <Banner tone="info" title="Fiyat girilmemiş" body="Düzenle ekranından paket / anlaşılan fiyatı girin; tahsilat takibi buna göre çalışır." /> : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {canFinance ? (
            <View style={{ flex: 1 }}>
              <Button label="Tahsilat ekle" icon="plus" size="M" disabled={row.net_amount <= 0 || row.balance_amount <= 0} onPress={() => setPaySheet(true)} />
            </View>
          ) : <View style={{ flex: 1 }} />}
          <IconButton icon="phone" variant="outline" label="Müşteriyi ara" disabled={!phone} onPress={() => phone && Linking.openURL(`tel:${phone}`)} />
          <IconButton icon="message-circle" variant="outline" label="WhatsApp ile yaz" disabled={!wa} onPress={() => wa && Linking.openURL(wa)} />
        </View>

        {canFinance ? (
          <View style={{ gap: 10 }}>
            <SectionHeader title="Ödemeler" />
            {payments.isError ? (
              <ErrorState message={payments.error instanceof Error ? payments.error.message : undefined} onRetry={() => payments.refetch()} />
            ) : payments.isLoading ? (
              <ListGroup><RowSkeleton /><RowSkeleton /></ListGroup>
            ) : paymentRows.length === 0 ? (
              <EmptyState title="Henüz ödeme alınmamış" description="Kapora ve ara ödemeler burada listelenir." />
            ) : (
              <ListGroup>
                {paymentRows.map((p) => (
                  <TransactionRow
                    key={p.id} kind="income" amount={p.amount} voided={!!p.voided_at} voidReason={p.void_reason}
                    title={INCOME_CATEGORY_LABELS[p.category]} meta={`${PAYMENT_METHOD_LABELS[p.method]} · ${formatDate(p.payment_date)}`}
                    onPress={p.voided_at ? undefined : () => setVoidMenu({ kind: "payments", id: p.id })}
                  />
                ))}
              </ListGroup>
            )}
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <SectionHeader title="Bilgiler" />
          <ListGroup>
            <ListRow icon="clock" title="Saat" value={`${formatTime(row.start_time)}–${formatTime(row.end_time)}`} />
            {v.usesResource ? <ListRow icon="map-pin" title={v.resourceField} value={row.venue?.name ?? "—"} /> : null}
            {row.location ? <ListRow icon="map-pin" title={v.usesResource ? "Etkinlik adresi" : "Çekim konumu"} subtitle={row.location} /> : null}
            {v.usesGuestCount ? <ListRow icon="users" title="Kişi sayısı" value={row.guest_count ? formatNumber(row.guest_count) : "—"} /> : null}
            <ListRow icon="package" title="Paket" value={row.package?.name ?? "Paketsiz"} />
            {v.usesTeams && row.team ? <ListRow icon="users" title="Ekip" value={row.team.name} /> : null}
            {v.usesDelivery ? <ListRow icon="images" title="Teslimat" value={row.delivery_due_date ? `Hedef ${formatDate(row.delivery_due_date)}` : badge.label} onPress={() => setDeliverySheet(true)} /> : null}
          </ListGroup>
        </View>

        {row.notes ? (
          <View style={{ gap: 10 }}>
            <SectionHeader title="Notlar" />
            <View style={{ padding: 16, borderRadius: 20, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle }}>
              <Text variant="body">{row.notes}</Text>
            </View>
          </View>
        ) : null}

        {row.customer ? (
          <View style={{ gap: 10 }}>
            <SectionHeader title="Müşteri" />
            <ListGroup>
              <ListRow icon="user" title={row.customer.full_name} />
              <ListRow icon="phone" title={formatPhone(row.customer.phone)} onPress={() => Linking.openURL(`tel:${row.customer!.phone}`)} />
            </ListGroup>
          </View>
        ) : null}

        {canFinance ? (
          <>
            <View style={{ gap: 10 }}>
              <SectionHeader title="Finans özeti" />
              <ListGroup>
                {row.pricing && row.pricing.extras_amount > 0 ? (
                  <>
                    <ListRow title="Paket / anlaşılan fiyat" value={formatMoney(row.pricing.package_amount)} />
                    {row.items.map((it) => <ListRow key={it.id} title={`+ ${it.name}`} value={formatMoney(it.amount)} />)}
                    <ListRow title="Toplam bedel" value={formatMoney(row.pricing.gross_amount)} />
                  </>
                ) : (
                  <ListRow title="Anlaşılan fiyat" value={formatMoney(row.pricing?.gross_amount ?? 0)} />
                )}
                {row.unit_price && row.guest_count ? <ListRow title="Kişi başı" value={`${formatMoney(row.unit_price)} × ${formatNumber(row.guest_count)}`} /> : null}
                <ListRow title="İndirim" value={formatMoney(row.pricing?.discount_amount ?? 0)} />
                <ListRow title="Net satış" value={formatMoney(row.net_amount)} />
              </ListGroup>
            </View>

            <View style={{ gap: 10 }}>
              <SectionHeader title="Bağlı giderler" action="Gider ekle" onAction={() => setExpSheet(true)} />
              {expenses.isError ? (
                <ErrorState message={expenses.error instanceof Error ? expenses.error.message : undefined} onRetry={() => expenses.refetch()} />
              ) : expenses.isLoading ? (
                <ListGroup><RowSkeleton /></ListGroup>
              ) : expenseRows.length === 0 ? (
                <EmptyState title={`Bu ${v.event.dative} bağlı gider yok`} description="Kârlılık hesabına giren kalemler burada listelenir." />
              ) : (
                <ListGroup>
                  {expenseRows.map((e) => (
                    <TransactionRow
                      key={e.id} kind="expense" amount={e.amount} voided={!!e.voided_at} voidReason={e.void_reason}
                      title={catName.get(e.category_id) ?? "Gider"} meta={`${e.description ? `${e.description} · ` : ""}${formatDate(e.expense_date)}`}
                      onPress={e.voided_at ? undefined : () => setVoidMenu({ kind: "expenses", id: e.id })}
                    />
                  ))}
                </ListGroup>
              )}
            </View>

            <View style={{ gap: 10 }}>
              <SectionHeader title="Kârlılık" />
              {/* Gider girilmemişken kâr = net satış çıkar ve "%100 kâr" der: bu sonuç değil eksik veri. */}
              {row.expense_amount === 0 ? (
                <Banner tone="warning" title="Kâr hesabı için gider girin" body={`Bu ${v.event.dative} bağlı gider girilmedi; kâr hesabı için önce giderleri ekleyin.`} />
              ) : (
                <ListGroup>
                  <ListRow title="Bağlı gider" value={formatMoney(row.expense_amount)} />
                  <ListRow title="Kâr" value={formatMoney(row.profit_amount)} />
                  <ListRow title="Kâr marjı" value={formatPercent(row.profit_margin)} />
                </ListGroup>
              )}
            </View>
          </>
        ) : (
          <View style={{ flexDirection: "row", gap: 12, padding: 16, borderRadius: 20, borderWidth: 1, borderStyle: "dashed", borderColor: colors.borderStrong, alignItems: "center" }}>
            <Icon name="lock" size={18} color="iconSecondary" />
            <Text variant="subhead" color="textSecondary" style={{ flex: 1 }}>Finansal bilgileri görme yetkiniz bulunmuyor.</Text>
          </View>
        )}
      </ScrollScreen>

      <PaymentSheet reservation={row} visible={paySheet} onClose={() => setPaySheet(false)} />
      <ExpenseSheet reservation={row} visible={expSheet} onClose={() => setExpSheet(false)} />
      {v.usesDelivery ? <DeliverySheet row={row} visible={deliverySheet} onClose={() => setDeliverySheet(false)} /> : null}

      <BottomSheet visible={menu} title={row.customer?.full_name ?? "Rezervasyon"} onClose={() => setMenu(false)} scroll={false}>
        <ListGroup style={{ borderWidth: 0 }}>
          <ListRow icon="calendar-days" title="Düzenle" onPress={() => { setMenu(false); router.push({ pathname: "/rezervasyon/form", params: { id: row.id } }); }} />
          {v.usesDelivery
            ? STAGE_FLOW.map((s: Stage) => (
                <ListRow key={s} icon={s === "olusturuldu" ? "calendar-check" : "package"} title={STAGES[s].label} onPress={() => run(() => updateStage.mutateAsync(s), `Durum: ${STAGES[s].label}`)} />
              ))
            : RESERVATION_STATUS_FLOW.filter((s) => s !== "iptal_edildi" && s !== row.status).map((s) => (
                <ListRow key={s} icon="calendar-check" title={`${RESERVATION_STATUS_LABELS[s]} yap`} onPress={() => run(() => updateStatus.mutateAsync(s), `Durum: ${RESERVATION_STATUS_LABELS[s]}`)} />
              ))}
          {!cancelled ? <ListRow icon="ban" title="Rezervasyonu iptal et" destructive onPress={() => { setMenu(false); setCancelAsk(true); }} /> : null}
        </ListGroup>
      </BottomSheet>

      <BottomSheet visible={!!voidMenu} title="Kayıt" onClose={() => setVoidMenu(null)} scroll={false}>
        <ListGroup style={{ borderWidth: 0 }}>
          <ListRow icon="ban" title={voidMenu?.kind === "payments" ? "Tahsilatı iptal et" : "Gideri iptal et"} subtitle="Kayıt silinmez; nedeniyle birlikte saklanır." destructive onPress={() => { setVoidTarget(voidMenu); setVoidMenu(null); }} />
        </ListGroup>
      </BottomSheet>

      <VoidDialog kind={voidTarget?.kind ?? "payments"} id={voidTarget?.id ?? null} visible={!!voidTarget} onClose={() => setVoidTarget(null)} />

      <ConfirmDialog
        visible={cancelAsk} destructive loading={guard.pending}
        title="Rezervasyon iptal edilsin mi?"
        message="Rezervasyon silinmez; durumu “İptal edildi” olur ve raporlara girmez. Tahsilat varsa ayrıca iptal edilmesi gerekir."
        confirmLabel="İptal et"
        onCancel={() => setCancelAsk(false)}
        onConfirm={async () => {
          await run(() => updateStatus.mutateAsync("iptal_edildi"), "Rezervasyon iptal edildi");
          setCancelAsk(false);
        }}
      />
    </Screen>
  );
}
