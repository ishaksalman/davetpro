import "server-only";
import type { OrganizationType } from "@/lib/database.types";

/** DavetMekanı entegrasyonunun kaynak anahtarı. leads.external_source'a yazılır. */
export const DAVETMEKANI_SOURCE = "davetmekani";

/**
 * DavetMekanı etkinlik türü slug'ı → DavetPro organizasyon türü.
 * Kontrat belgesindeki tabloyla birebir aynı olmalı.
 */
const TUR_ESLEME: Record<string, OrganizationType> = {
  dugun: "dugun",
  nisan: "nisan",
  kina: "kina",
  soz: "soz",
  sunnet: "sunnet",
  davet: "davet",
  "kurumsal-etkinlik": "kurumsal",
  "dogum-gunu": "diger",
  mezuniyet: "diger",
};

/**
 * Eşlenmemiş slug sessizce düşürülmez: 'diger'e alınır ve loglanır.
 * DavetMekanı'na yeni bir etkinlik türü eklendiğinde burayı güncelle.
 */
export function organizasyonTuru(slug: string | null | undefined): OrganizationType {
  if (!slug) return "dugun";
  const eslesme = TUR_ESLEME[slug];
  if (!eslesme) {
    console.warn(`[davetmekani] eşlenmemiş etkinlik türü: "${slug}" → diger`);
    return "diger";
  }
  return eslesme;
}
