import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatMoney, formatNumber, formatTimeRange } from "@/lib/format";
import type { ReservationRow } from "@/lib/queries";

/**
 * Müşteriye gönderilecek rezervasyon bilgilendirme metni.
 *
 * Otomatik gönderilmiyor: salon sahibi düğmeye basınca WhatsApp hazır mesajla
 * açılıyor. Yanlış girilen veya düzeltilecek bir rezervasyonda müşteriye
 * anında mesaj gitmesini istemiyoruz; sözleşme ve teklif paylaşımında da
 * aynı yaklaşım kullanıldı.
 *
 * Finans satırları yalnızca finansal yetkisi olan kullanıcıya çıkıyor —
 * personelin gönderdiği mesajda tutarlar görünmemeli.
 */
export function reservationNoticeMessage({
  reservation,
  customerName,
  businessName,
  showFinance,
}: {
  reservation: ReservationRow;
  customerName: string;
  businessName: string;
  showFinance: boolean;
}): string {
  const satirlar: string[] = [
    `Merhaba ${customerName},`,
    "",
    `${formatDate(reservation.event_date)} tarihli ` +
      `${ORGANIZATION_TYPE_LABELS[reservation.organization_type].toLocaleLowerCase("tr")} ` +
      `organizasyonunuz için rezervasyonunuz oluşturulmuştur.`,
    "",
  ];

  if (reservation.venue?.name) satirlar.push(`Salon: ${reservation.venue.name}`);
  satirlar.push(
    `Saat: ${formatTimeRange(reservation.start_time, reservation.end_time)}`,
  );
  if (reservation.guest_count) {
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
