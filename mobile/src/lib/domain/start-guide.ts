import type { Package, Venue } from "@/lib/database.types";

export type GuideRoute = "/ayarlar/isletme" | "/tanimlar/salonlar" | "/tanimlar/paketler" | "/rezervasyon/form";

export type GuideStep = {
  id: "isletme" | "kaynak" | "paket" | "rezervasyon";
  title: string;
  description: string;
  done: boolean;
  optional: boolean;
  route: GuideRoute;
  actionLabel: string;
  /** Adım şu an başlatılamıyorsa nedeni (düğme kapalı gösterilir). */
  blockedReason?: string;
};

type Input = {
  business: { phone: string | null; address: string | null };
  venues: Pick<Venue, "is_active" | "allows_overlap" | "name">[];
  packages: Pick<Package, "is_active">[];
  reservationCount: number;
  /** Fotoğrafçıda kaynak (plato) kavramı kapalı: adım hiç çıkmaz. */
  usesResource: boolean;
  resourceSingular: string;
};

/**
 * Yeni hesapların başlangıç rehberi — web `onboardingSteps` ile aynı kurallar; hepsi kayıtlara
 * bakılarak işaretlenir, kullanıcı elle işaretlemez. Mobilde "ilk sözleşme" adımı YOK:
 * sözleşme PDF'i sunucu gerektirir ve mobilde yapılmaz.
 *
 * Kaynak (salon/plato/mekân) salonda zorunlu. Organizasyon firmasında kayıtta "Dış mekân" gibi çakışma
 * kuralı işlemeyen bir satır açılır; kendi mekânı olmayan da çalışabildiği için orada isteğe bağlıdır.
 */
export function guideSteps(i: Input): GuideStep[] {
  const venues = i.venues.filter((v) => v.is_active);
  const ownVenue = venues.some((v) => !v.allows_overlap);
  const openVenue = venues.find((v) => v.allows_overlap);
  const kaynak = i.resourceSingular.toLocaleLowerCase("tr-TR");

  const steps: GuideStep[] = [
    {
      id: "isletme",
      title: "İşletme bilgilerini gir",
      description: "Adres, telefon ve logo sözleşmenin başlığında görünür.",
      done: Boolean(i.business.phone?.trim() && i.business.address?.trim()),
      optional: false,
      route: "/ayarlar/isletme",
      actionLabel: "Bilgileri gir",
    },
  ];
  if (i.usesResource) {
    steps.push({
      id: "kaynak",
      title: `${i.resourceSingular} ekle`,
      description: openVenue
        ? `Dışarıdaki işler için kayıtlı "${openVenue.name}" seçeneği yeterli. Kendine ait bir ${kaynak} varsa çakışma kontrolü için ekle.`
        : "Takvim ve müsaitlik kontrolü bu kayda göre çalışır.",
      done: ownVenue,
      optional: Boolean(openVenue),
      route: "/tanimlar/salonlar",
      actionLabel: `${i.resourceSingular} ekle`,
    });
  }
  steps.push(
    {
      id: "paket",
      title: "Paketlerini tanımla",
      description: "Rezervasyonda paket seçince fiyat ve hizmetler kendiliğinden gelir.",
      done: i.packages.some((p) => p.is_active),
      optional: true,
      route: "/tanimlar/paketler",
      actionLabel: "Paket ekle",
    },
    {
      id: "rezervasyon",
      title: "İlk rezervasyonu oluştur",
      description: "Müşteriyi, tarihi ve fiyatı gir; kapora da buradan alınır.",
      done: i.reservationCount > 0,
      optional: false,
      route: "/rezervasyon/form",
      actionLabel: "Rezervasyon oluştur",
      // Web ile aynı: hiç kaynak kaydı yoksa rezervasyon formu açılamaz.
      blockedReason: i.venues.length === 0 ? `Önce ${kaynak} ekle` : undefined,
    },
  );
  return steps;
}

/** İlk eksik ZORUNLU adım: vurgu orada olur, isteğe bağlı bir adım sırayı tutmaz. */
export function nextGuideStepId(steps: GuideStep[]): GuideStep["id"] | undefined {
  return steps.find((s) => !s.optional && !s.done)?.id;
}

/** Zorunlu adımların hepsi bitince rehber kendiliğinden kaybolur. */
export function guideComplete(steps: GuideStep[]): boolean {
  return steps.filter((s) => !s.optional).every((s) => s.done);
}
