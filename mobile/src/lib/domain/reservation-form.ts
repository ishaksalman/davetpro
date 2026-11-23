import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reservationSchema, type ReservationInput } from "@/lib/schemas";
import type { Reservation, ReservationItem, ReservationPricing, Venue, Package } from "@/lib/database.types";
import type { Vertical } from "@/lib/vertical";

export type EditableReservation = Reservation & { pricing?: ReservationPricing | null; items?: ReservationItem[] | null };

/**
 * Yeni/düzenleme formunun başlangıç değerleri — web `ReservationFormDialog`
 * ile aynı kurallar:
 *  - salon yalnızca TEK salon varsa otomatik seçilir (yanlış salona kayıt riski);
 *  - organizasyon firmasında varsayılan DIŞ MEKÂN;
 *  - fotoğrafçıda salon seçimi yok: serbest alan ("Diğer", allows_overlap);
 *  - durum formda seçilmez: yeni kayıt "kesinlesti";
 *  - kalan ödeme tarihi yeni kayıtta organizasyon tarihini izler (aşağıda ekranda).
 */
export function reservationDefaults(a: {
  reservation?: EditableReservation | null;
  defaults?: { event_date?: string; venue_id?: string; start_time?: string; end_time?: string };
  vertical: Vertical;
  venues: Venue[];
}): ReservationInput {
  const { reservation: r, defaults: d, vertical: v } = a;
  const active = a.venues.filter((x) => x.is_active || x.id === r?.venue_id);
  const disMekan = active.find((x) => x.allows_overlap);

  const venueId =
    r?.venue_id ??
    d?.venue_id ??
    (!v.usesResource
      ? ((disMekan ?? active[0])?.id ?? "")
      : v.usesLocationChoice && disMekan
        ? disMekan.id
        : active.length === 1
          ? active[0].id
          : "");

  return {
    id: r?.id,
    customer_id: r?.customer_id ?? "",
    venue_id: venueId,
    package_id: r?.package_id ?? "none",
    organization_type: r?.organization_type ?? v.defaultEventType,
    status: r?.status ?? "kesinlesti",
    event_date: r?.event_date ?? d?.event_date ?? "",
    start_time: r?.start_time?.slice(0, 5) ?? d?.start_time ?? v.defaultTimes.start,
    end_time: r?.end_time?.slice(0, 5) ?? d?.end_time ?? v.defaultTimes.end,
    guest_count: r?.guest_count ?? "",
    location: r?.location ?? "",
    team_id: r?.team_id ?? null,
    notes: r?.notes ?? "",
    pricing_type: r?.pricing?.unit_price ? "kisi_basi" : "sabit",
    unit_price: r?.pricing?.unit_price ?? 0,
    package_amount: r?.pricing?.package_amount ?? 0,
    items: r?.items?.map((i) => ({ name: i.name, amount: i.amount })) ?? [],
    discount_amount: r?.pricing?.discount_amount ?? 0,
    due_date: r?.pricing?.due_date ?? undefined,
    deposit_amount: 0,
  };
}

/**
 * Finans yetkisi olmayan kullanıcıda fiyat alanları hiç gösterilmez; şemanın
 * "Fiyat girin." kuralı bu kullanıcıyı kilitlemesin diye doğrulama yer tutucu
 * fiyatla yapılır (RPC zaten fiyatı yok sayar; bkz. prepareReservation).
 */
export function reservationResolver(canFinance: boolean): Resolver<ReservationInput> {
  const base = zodResolver(reservationSchema) as unknown as Resolver<ReservationInput>;
  if (canFinance) return base;
  return (values, ctx, opts) =>
    base({ ...values, package_amount: 1, items: [], discount_amount: 0, deposit_amount: 0, pricing_type: "sabit", unit_price: null }, ctx, opts);
}

/** Salona bağlı paketler yalnızca o salonda; düzenlemede mevcut paket her zaman kalır. */
export function selectablePackages(packages: Package[], venueId: string, currentPackageId?: string | null): Package[] {
  return packages.filter((p) => (p.is_active || p.id === currentPackageId) && (!p.venue_id || p.venue_id === venueId || p.id === currentPackageId));
}
