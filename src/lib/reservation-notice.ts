import { ORGANIZATION_TYPE_LABELS } from "./constants.ts";
import { formatDate, formatMoney, formatNumber, formatTimeRange } from "./format.ts";
import type { ReservationRow } from "./queries.ts";
import { buyukHarf, type Vertical } from "./vertical.ts";

/**
 * Müşteriye gönderilecek hazır WhatsApp metinleri.
 *
 * Hiçbiri otomatik gönderilmiyor: işletme sahibi seçince WhatsApp hazır
 * mesajla açılıyor. Yanlış girilen veya düzeltilecek bir kayıtta müşteriye
 * anında mesaj gitmesini istemiyoruz; sözleşme ve teklif paylaşımında da
 * aynı yaklaşım kullanıldı.
 *
 * Finans satırları yalnızca finansal yetkisi olan kullanıcıya çıkıyor —
 * personelin gönderdiği mesajda tutarlar görünmemeli.
 *
 * Sözcükler `sozluk`tan geliyor: "organizasyonunuz" / "çekiminiz" ve "Salon" /
 * "Plato" işe göre değişiyor (Türkçe ekler için bkz. vertical.ts).
 */
export type CustomerMessage = { key: string; label: string; text: string };

type Input = {
  reservation: ReservationRow;
  customerName: string;
  businessName: string;
  showFinance: boolean;
  sozluk: Vertical;
};

function tur(reservation: ReservationRow): string {
  return ORGANIZATION_TYPE_LABELS[reservation.organization_type].toLocaleLowerCase("tr");
}

/** Rezervasyon onayı: oluşturulduğunda müşteriye bilgi. */
export function reservationNoticeMessage({
  reservation,
  customerName,
  businessName,
  showFinance,
  sozluk,
}: Input): string {
  const satirlar: string[] = [
    `Merhaba ${customerName},`,
    "",
    `${formatDate(reservation.event_date)} tarihli ${tur(reservation)} ` +
      `${sozluk.event.possessive} için rezervasyonunuz oluşturulmuştur.`,
    "",
  ];

  if (sozluk.usesResource && reservation.venue?.name) {
    satirlar.push(`${sozluk.resourceField}: ${reservation.venue.name}`);
  }
  satirlar.push(
    `Saat: ${formatTimeRange(reservation.start_time, reservation.end_time)}`,
  );
  if (reservation.location) satirlar.push(`Yer: ${reservation.location}`);
  if (sozluk.usesGuestCount && reservation.guest_count) {
    satirlar.push(`Kişi sayısı: ${formatNumber(reservation.guest_count)}`);
  }

  if (showFinance && reservation.net_amount > 0) {
    satirlar.push("", `Toplam: ${formatMoney(reservation.net_amount)}`);

    if (reservation.collected_amount > 0) {
      satirlar.push(`Alınan ödeme: ${formatMoney(reservation.collected_amount)}`);
    }

    if (reservation.balance_amount > 0) {
      const sonOdeme = reservation.due_date
        ? ` (son ödeme ${formatDate(reservation.due_date)})`
        : "";
      satirlar.push(`Kalan: ${formatMoney(reservation.balance_amount)}${sonOdeme}`);
    }
  }

  satirlar.push("", businessName);
  return satirlar.join("\n");
}

/** Gün öncesi hatırlatma: tarih, saat ve yer. */
export function reservationReminderMessage({
  reservation,
  customerName,
  businessName,
  sozluk,
}: Input): string {
  const satirlar = [
    `Merhaba ${customerName},`,
    "",
    `${formatDate(reservation.event_date)} günü saat ` +
      `${reservation.start_time.slice(0, 5)} için ${sozluk.event.possessive} hatırlatması.`,
  ];
  if (reservation.location) satirlar.push(`Yer: ${reservation.location}`);
  else if (sozluk.usesResource && reservation.venue?.name) {
    satirlar.push(`${sozluk.resourceField}: ${reservation.venue.name}`);
  }
  satirlar.push("", "Bir değişiklik olursa lütfen haber verin.", "", businessName);
  return satirlar.join("\n");
}

/** Kalan ödeme hatırlatması. Bakiye yoksa null: gönderilecek bir şey yok. */
export function balanceReminderMessage({
  reservation,
  customerName,
  businessName,
  sozluk,
}: Input): string | null {
  if (reservation.balance_amount <= 0) return null;
  const vade = reservation.due_date
    ? ` ${formatDate(reservation.due_date)} tarihine kadar`
    : "";
  return [
    `Merhaba ${customerName},`,
    "",
    `${formatDate(reservation.event_date)} tarihli ${sozluk.event.possessive} için ` +
      `kalan ödemeniz ${formatMoney(reservation.balance_amount)} tutarındadır;${vade} ` +
      `tamamlamanızı rica ederiz.`,
    "",
    businessName,
  ].join("\n");
}

/** Teslim bildirimi: galeri bağlantısıyla. Bağlantı yoksa null. */
export function deliveryMessage({
  reservation,
  customerName,
  businessName,
}: Input): string | null {
  if (!reservation.delivery_link) return null;
  return [
    `Merhaba ${customerName},`,
    "",
    `${formatDate(reservation.event_date)} tarihli çekiminizin fotoğrafları hazır:`,
    reservation.delivery_link,
    "",
    "Keyifle kullanmanızı dileriz.",
    "",
    businessName,
  ].join("\n");
}

/**
 * Menüde gösterilecek hazır mesajlar. Uygulanamayanlar (bakiye yok, bağlantı
 * yok, teslim akışı olmayan iş) listede hiç çıkmıyor.
 */
export function customerMessages(input: Input): CustomerMessage[] {
  const out: CustomerMessage[] = [
    { key: "onay", label: `${buyukHarf(input.sozluk.event.singular)} bilgisi`, text: reservationNoticeMessage(input) },
    { key: "hatirlatma", label: "Gün öncesi hatırlatma", text: reservationReminderMessage(input) },
  ];
  if (input.showFinance) {
    const bakiye = balanceReminderMessage(input);
    if (bakiye) out.push({ key: "bakiye", label: "Kalan ödeme hatırlatması", text: bakiye });
  }
  if (input.sozluk.usesDelivery) {
    const teslim = deliveryMessage(input);
    if (teslim) out.push({ key: "teslim", label: "Fotoğraflar hazır", text: teslim });
  }
  return out;
}
