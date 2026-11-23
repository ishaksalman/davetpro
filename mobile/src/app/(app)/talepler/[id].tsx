import { useState } from "react";
import { Share, View } from "react-native";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import {
  LEAD_ACTIVITY_LABELS, LEAD_LOST_REASON_LABELS, LEAD_SOURCE_LABELS, ORGANIZATION_TYPE_LABELS, QUOTE_STATUS_LABELS,
} from "@/lib/constants";
import { formatDate, formatDateLong, formatDateTime, formatMoney, formatNumber, formatPhone, formatTime, whatsAppLink } from "@/lib/format";
import { useAppSession, useSessionContext } from "~/lib/auth/session";
import { useLead, useLeadActions } from "~/lib/data/leads";
import { useLookups } from "~/lib/data/lookups";
import { LEAD_TONE, isOpenLead, leadStatusLabel, quoteShareText } from "~/lib/domain/leads";
import { useRefetchOnFocus, useSubmitGuard } from "~/lib/hooks";
import { StatusBadge, type Tone } from "~/ui/Badge";
import { Button, IconButton } from "~/ui/Button";
import { Banner, ConfirmDialog, EmptyState, ErrorState, RowSkeleton, Skeleton, useToast } from "~/ui/Feedback";
import { ListGroup, ListRow, SectionHeader } from "~/ui/List";
import { InlineHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { BottomSheet } from "~/ui/Sheet";
import { Text } from "~/ui/Text";
import { ActivitySheet, ConvertSheet, ExtendHoldSheet, FollowUpSheet, HoldSheet, LostSheet, QuoteSheet } from "~/features/lead-sheets";
import type { Quote } from "@/lib/database.types";

const QUOTE_TONE: Record<Quote["status"], Tone> = { taslak: "neutral", gonderildi: "info", kabul: "success", reddedildi: "danger", suresi_doldu: "warning" };

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const s = useAppSession();
  const { vertical: v, canFinance } = useSessionContext();
  const q = useLead(id);
  const lookups = useLookups();
  const actions = useLeadActions(id);
  const guard = useSubmitGuard();
  useRefetchOnFocus(q.refetch);

  const [sheet, setSheet] = useState<null | "lost" | "activity" | "followup" | "hold" | "extend" | "quote" | "convert">(null);
  const [quoteMenu, setQuoteMenu] = useState<Quote | null>(null);
  const [cancelHold, setCancelHold] = useState(false);
  const [reopen, setReopen] = useState(false);

  const header = <InlineHeader title="Talep" />;
  if (q.isLoading || lookups.isLoading) return <Screen>{header}<ScrollScreen><Skeleton height={24} width={100} /><Skeleton height={28} width={200} /><RowSkeleton /><RowSkeleton /></ScrollScreen></Screen>;
  if (q.isError || lookups.isError) return <Screen>{header}<ScrollScreen><ErrorState message={(q.error ?? lookups.error) instanceof Error ? (q.error ?? lookups.error)!.message : undefined} onRetry={() => { q.refetch(); lookups.refetch(); }} /></ScrollScreen></Screen>;
  const d = q.data;
  if (!d || !lookups.data) return <Screen>{header}<ScrollScreen><EmptyState title="Talep bulunamadı" description="Kayıt silinmiş ya da erişim yetkiniz yok." action={{ label: "Listeye dön", onPress: () => router.replace("/talepler") }} /></ScrollScreen></Screen>;

  const { lead } = d;
  const open = isOpenLead(lead.status) && !lead.reservation_id;
  const converted = !!lead.reservation_id;
  const activeHold = d.holds.find((h) => h.status === "aktif") ?? null;
  const customer = lookups.data.customers.find((c) => c.id === lead.customer_id);
  const assignee = d.members.find((m) => m.id === lead.assigned_to)?.full_name;
  const wa = whatsAppLink(customer?.phone);
  const venues = lookups.data.venues;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string, after?: () => void) =>
    guard.run(async () => {
      const r = await fn();
      if (!r.ok) toast({ tone: "danger", message: r.error ?? "İşlem yapılamadı." });
      else { toast({ tone: "success", message: ok }); after?.(); }
    });

  const shareQuote = async (quote: Quote) => {
    try {
      await Share.share({ message: quoteShareText({ business: s.business.name, customer: customer?.full_name ?? "", quote, items: d.items.filter((i) => i.quote_id === quote.id), venue: lead.venue?.name, vertical: v }) });
    } catch { /* kullanıcı vazgeçti */ }
  };

  return (
    <Screen>
      <InlineHeader title="Talep" trailing={open ? <Button label="Düzenle" variant="ghost" size="S" fullWidth={false} onPress={() => router.push({ pathname: "/talepler/form", params: { id: lead.id } })} /> : undefined} />
      <ScrollScreen onRefresh={() => q.refetch()} refreshing={q.isRefetching} bottomPad={40}>
        <View style={{ gap: 8, paddingTop: 8 }}>
          <StatusBadge label={leadStatusLabel(lead.status)} tone={LEAD_TONE[lead.status]} />
          <Text variant="title1" accessibilityRole="header">{customer?.full_name ?? "—"}</Text>
          <Text variant="subhead" color="textSecondary">{lead.event_date ? `${formatDateLong(lead.event_date)}${v.usesResource && lead.venue ? ` · ${lead.venue.name}` : ""}` : "Tarih henüz belirsiz"}</Text>
        </View>

        {converted ? (
          <Banner tone="success" title="Rezervasyona dönüştürüldü" body="Bu talep artık bir rezervasyon." />
        ) : null}
        {lead.status === "kaybedildi" ? <Banner tone="info" title={`Kaybedildi: ${lead.lost_reason ? LEAD_LOST_REASON_LABELS[lead.lost_reason] : "—"}`} body={lead.lost_note ?? undefined} /> : null}
        {lead.follow_up_overdue ? <Banner tone="warning" title="Takip tarihi geçti" body={`${formatDateTime(lead.next_follow_up_at)} tarihinde aranması planlanmıştı.`} /> : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            {converted && lead.reservation_id ? (
              <Button label="Rezervasyonu aç" size="M" onPress={() => router.push({ pathname: "/rezervasyon/[id]", params: { id: lead.reservation_id! } })} />
            ) : open && canFinance ? (
              <Button label="Rezervasyona dönüştür" icon="calendar-check" size="M" onPress={() => setSheet("convert")} />
            ) : lead.status === "kaybedildi" ? (
              <Button label="Yeniden aç" icon="rotate-ccw" size="M" onPress={() => setReopen(true)} />
            ) : (
              <Button label="Görüşme ekle" icon="plus" size="M" onPress={() => setSheet("activity")} />
            )}
          </View>
          <IconButton icon="phone" variant="outline" label="Ara" disabled={!customer} onPress={() => customer && Linking.openURL(`tel:${customer.phone}`)} />
          <IconButton icon="message-circle" variant="outline" label="WhatsApp ile yaz" disabled={!wa} onPress={() => wa && Linking.openURL(wa)} />
        </View>

        <View style={{ gap: 10 }}>
          <SectionHeader title="Genel bilgiler" />
          <ListGroup>
            <ListRow icon="tag" title="Tür" value={ORGANIZATION_TYPE_LABELS[lead.organization_type]} />
            <ListRow icon="info" title="Kaynak" value={LEAD_SOURCE_LABELS[lead.source]} />
            {lead.start_time && lead.end_time ? <ListRow icon="clock" title="Saat" value={`${formatTime(lead.start_time)}–${formatTime(lead.end_time)}`} /> : null}
            {v.usesResource ? <ListRow icon="map-pin" title={v.resourceField} value={lead.venue?.name ?? "Belirsiz"} /> : null}
            {v.usesGuestCount ? <ListRow icon="users" title="Kişi sayısı" value={lead.guest_count ? formatNumber(lead.guest_count) : "—"} /> : null}
            <ListRow icon="package" title="Paket" value={lead.package?.name ?? "Belirsiz"} />
            {assignee ? <ListRow icon="user" title="İlgilenen" value={assignee} /> : null}
            {customer ? <ListRow icon="phone" title="Telefon" value={formatPhone(customer.phone)} onPress={() => Linking.openURL(`tel:${customer.phone}`)} /> : null}
            {open ? <ListRow icon="calendar-clock" title="Takip" value={lead.next_follow_up_at ? formatDateTime(lead.next_follow_up_at) : "Belirtilmedi"} onPress={() => setSheet("followup")} /> : null}
            {lead.notes ? <ListRow icon="file-text" title="Notlar" subtitle={lead.notes} /> : null}
          </ListGroup>
        </View>

        {v.usesResource || activeHold || open ? (
          <View style={{ gap: 10 }}>
            <SectionHeader title="Opsiyon" />
            {activeHold ? (
              <View style={{ gap: 12 }}>
                <ListGroup>
                  <ListRow icon="clock" title="Aktif opsiyon" subtitle={`${formatDate(activeHold.event_date)} · ${formatTime(activeHold.start_time)}–${formatTime(activeHold.end_time)}`} value={`Bitiş ${formatDateTime(activeHold.expires_at)}`} />
                </ListGroup>
                {open ? (
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}><Button label="Uzat" variant="secondary" size="M" onPress={() => setSheet("extend")} /></View>
                    <View style={{ flex: 1 }}><Button label="Opsiyonu iptal et" variant="outline" size="M" onPress={() => setCancelHold(true)} /></View>
                  </View>
                ) : null}
              </View>
            ) : open && v.usesResource ? (
              <Button label="Tarihi opsiyona al" icon="calendar-clock" variant="secondary" size="M" onPress={() => setSheet("hold")} />
            ) : (
              <Text variant="subhead" color="textSecondary">Aktif opsiyon yok.</Text>
            )}
          </View>
        ) : null}

        {canFinance ? (
          <View style={{ gap: 10 }}>
            <SectionHeader title="Teklifler" action={open ? "Teklif oluştur" : undefined} onAction={() => setSheet("quote")} />
            {d.quotes.length === 0 ? (
              <EmptyState title="Henüz teklif yok" description="Teklif hiçbir gelir ya da tahsilat kaydı üretmez; yalnızca müşteriye verilen fiyattır." />
            ) : (
              <ListGroup>
                {d.quotes.map((qt) => (
                  <ListRow
                    key={qt.id}
                    icon="file-text"
                    title={`${qt.quote_number}${qt.version > 1 ? ` · ${qt.version}. sürüm` : ""}`}
                    subtitle={qt.valid_until ? `Geçerlilik ${formatDate(qt.valid_until)}` : undefined}
                    right={<View style={{ alignItems: "flex-end", gap: 4 }}><Text variant="numericS">{formatMoney(qt.total_amount)}</Text><StatusBadge label={QUOTE_STATUS_LABELS[qt.status]} tone={QUOTE_TONE[qt.status]} size="S" /></View>}
                    onPress={() => setQuoteMenu(qt)}
                  />
                ))}
              </ListGroup>
            )}
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <SectionHeader title="Görüşmeler" action={open ? "Ekle" : undefined} onAction={() => setSheet("activity")} />
          {d.activities.length === 0 ? (
            <Text variant="subhead" color="textSecondary">Henüz görüşme kaydı yok.</Text>
          ) : (
            <ListGroup>
              {d.activities.map((a) => (
                <ListRow key={a.id} icon={a.is_system ? "info" : "message-circle"} title={LEAD_ACTIVITY_LABELS[a.type]} subtitle={a.note ?? undefined} value={formatDateTime(a.occurred_at)} />
              ))}
            </ListGroup>
          )}
        </View>

        {open ? <Button label="Kaybedildi olarak işaretle" variant="ghost" onPress={() => setSheet("lost")} /> : null}
      </ScrollScreen>

      <LostSheet leadId={lead.id} visible={sheet === "lost"} onClose={() => setSheet(null)} />
      <ActivitySheet leadId={lead.id} visible={sheet === "activity"} onClose={() => setSheet(null)} />
      <FollowUpSheet leadId={lead.id} current={lead.next_follow_up_at} visible={sheet === "followup"} onClose={() => setSheet(null)} />
      <HoldSheet lead={lead} venues={venues} visible={sheet === "hold"} onClose={() => setSheet(null)} />
      {activeHold ? <ExtendHoldSheet leadId={lead.id} hold={activeHold} visible={sheet === "extend"} onClose={() => setSheet(null)} /> : null}
      <QuoteSheet lead={lead} venues={venues} packages={lookups.data.packages} visible={sheet === "quote"} onClose={() => setSheet(null)} />
      <ConvertSheet detail={d} venues={venues} packages={lookups.data.packages} visible={sheet === "convert"} onClose={() => setSheet(null)} onConverted={(rid) => { setSheet(null); router.replace({ pathname: "/rezervasyon/[id]", params: { id: rid } }); }} />

      <BottomSheet visible={!!quoteMenu} title={quoteMenu?.quote_number ?? "Teklif"} onClose={() => setQuoteMenu(null)} scroll={false}>
        <ListGroup style={{ borderWidth: 0 }}>
          <ListRow icon="message-circle" title="Teklifi paylaş" subtitle="Metin olarak WhatsApp, e-posta vb. ile gönderin." onPress={() => { const qt = quoteMenu!; setQuoteMenu(null); void shareQuote(qt); }} />
          {quoteMenu && quoteMenu.status !== "gonderildi" && quoteMenu.status !== "kabul" ? <ListRow icon="mail" title="Gönderildi olarak işaretle" onPress={() => { const qt = quoteMenu; setQuoteMenu(null); void run(() => actions.quoteStatus.mutateAsync({ id: qt.id, status: "gonderildi" }), "Teklif gönderildi olarak işaretlendi"); }} /> : null}
          {quoteMenu && quoteMenu.status !== "kabul" ? <ListRow icon="circle-check" title="Kabul edildi" onPress={() => { const qt = quoteMenu; setQuoteMenu(null); void run(() => actions.quoteStatus.mutateAsync({ id: qt.id, status: "kabul" }), "Teklif kabul edildi"); }} /> : null}
          {quoteMenu && quoteMenu.status !== "reddedildi" ? <ListRow icon="ban" title="Reddedildi" destructive onPress={() => { const qt = quoteMenu; setQuoteMenu(null); void run(() => actions.quoteStatus.mutateAsync({ id: qt.id, status: "reddedildi" }), "Teklif reddedildi"); }} /> : null}
        </ListGroup>
      </BottomSheet>

      <ConfirmDialog visible={cancelHold} destructive loading={guard.pending} title="Opsiyon iptal edilsin mi?" message="Tarih ve saat tekrar başkalarına açılır." confirmLabel="Opsiyonu iptal et" onCancel={() => setCancelHold(false)}
        onConfirm={async () => { if (activeHold) await run(() => actions.cancelHold.mutateAsync(activeHold.id), "Opsiyon iptal edildi"); setCancelHold(false); }} />
      <ConfirmDialog visible={reopen} loading={guard.pending} title="Talep yeniden açılsın mı?" message="Talep tekrar satış hattına alınır ve kaybetme nedeni temizlenir." confirmLabel="Yeniden aç" onCancel={() => setReopen(false)}
        onConfirm={async () => { await run(() => actions.reopen.mutateAsync(), "Talep yeniden açıldı"); setReopen(false); }} />
    </Screen>
  );
}
