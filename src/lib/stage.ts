import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_STYLES,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_STYLES,
// Göreli yol + uzantı: bu dosya node --test altında da çalıştırılıyor ve
// orada "@/" takma adı çözülmüyor (bkz. schemas.ts).
} from "./constants.ts";
import type { DeliveryStatus, ReservationStatus } from "./database.types.ts";

/**
 * Fotoğrafçıda tek bir "durum" — iki kolonun birleşimi.
 *
 * NEDEN İKİ KOLON KALIYOR: `status` satışın durumu (iptal edilebilir, rapora
 * girer), `delivery_status` işin nerede olduğu. Salon ikincisini hiç
 * kullanmıyor. Kolonları birleştirmek salon tarafını da bozardı ve
 * "iptal edildi" ile "baskıda" aynı eksene binerdi — biri diğerini siler.
 *
 * Birleştirme yalnızca ARAYÜZDE: kullanıcı tek liste görüyor, seçim iki
 * kolonu birlikte yazıyor.
 */
export type Stage =
  | "olusturuldu"
  | DeliveryStatus
  | "iptal_edildi";

type StageDef = {
  label: string;
  style: string;
  /** Seçilince yazılacak değerler. */
  writes: { status: ReservationStatus; delivery_status: DeliveryStatus | null };
};

export const STAGES: Record<Stage, StageDef> = {
  olusturuldu: {
    label: RESERVATION_STATUS_LABELS.kesinlesti,
    style: RESERVATION_STATUS_STYLES.kesinlesti,
    writes: { status: "kesinlesti", delivery_status: null },
  },
  cekim_yapildi: {
    label: DELIVERY_STATUS_LABELS.cekim_yapildi,
    style: DELIVERY_STATUS_STYLES.cekim_yapildi,
    writes: { status: "kesinlesti", delivery_status: "cekim_yapildi" },
  },
  secim_bekleniyor: {
    label: DELIVERY_STATUS_LABELS.secim_bekleniyor,
    style: DELIVERY_STATUS_STYLES.secim_bekleniyor,
    writes: { status: "kesinlesti", delivery_status: "secim_bekleniyor" },
  },
  duzenleniyor: {
    label: DELIVERY_STATUS_LABELS.duzenleniyor,
    style: DELIVERY_STATUS_STYLES.duzenleniyor,
    writes: { status: "kesinlesti", delivery_status: "duzenleniyor" },
  },
  baskida: {
    label: DELIVERY_STATUS_LABELS.baskida,
    style: DELIVERY_STATUS_STYLES.baskida,
    writes: { status: "kesinlesti", delivery_status: "baskida" },
  },
  // Teslim, fotoğrafçıda işin bittiği an: satış durumu da 'tamamlandi'ya
  // geçiyor. Aksi halde o değere fotoğrafçı tarafından hiç ulaşılamazdı.
  teslim_edildi: {
    label: DELIVERY_STATUS_LABELS.teslim_edildi,
    style: DELIVERY_STATUS_STYLES.teslim_edildi,
    writes: { status: "tamamlandi", delivery_status: "teslim_edildi" },
  },
  iptal_edildi: {
    label: RESERVATION_STATUS_LABELS.iptal_edildi,
    style: RESERVATION_STATUS_STYLES.iptal_edildi,
    writes: { status: "iptal_edildi", delivery_status: null },
  },
};

/** Menüde gösterilen sıra. İptal listede yok; ayrı butonda. */
export const STAGE_FLOW: Stage[] = [
  "olusturuldu",
  "cekim_yapildi",
  "secim_bekleniyor",
  "duzenleniyor",
  "baskida",
  "teslim_edildi",
];

/**
 * İki kolondan görünen aşamayı türetir.
 *
 * İPTAL ÖNCELİKLİ: iptal edilmiş bir işin teslim aşaması hâlâ doluysa
 * (iptalden önce ilerlemişse) kullanıcıya "Baskıda" demek yanlış olur.
 * Kolon temizlenmiyor ki iptal geri alınınca geçmiş kaybolmasın.
 */
export function reservationStage(
  status: ReservationStatus,
  delivery: DeliveryStatus | null,
): Stage {
  if (status === "iptal_edildi") return "iptal_edildi";
  return delivery ?? "olusturuldu";
}
