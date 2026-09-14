import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { requireSession } from "@/lib/auth";
import { getReservationRows } from "@/lib/queries";
import { todayISO } from "@/lib/time";
import { vertical } from "@/lib/vertical";
import { DeliveryBoard } from "./delivery-board";

export const metadata: Metadata = { title: "Teslimat" };

/**
 * Çekim sonrası takip.
 *
 * Yalnızca teslim akışı kullanan işletmelerde açık; salonda böyle bir süreç
 * yok. Yetkisiz tipte notFound(): yönlendirme sayfanın varlığını doğrular.
 *
 * Liste GEÇMİŞ organizasyonlardan kuruluyor — teslim edilecek bir şey ancak
 * çekim yapıldıktan sonra oluşuyor.
 */
export default async function DeliveryPage() {
  const { business } = await requireSession();
  const sozluk = vertical(business.business_type);
  if (!sozluk.usesDelivery) notFound();

  const { rows, error } = await getReservationRows({
    to: todayISO(),
    ascending: false,
  });

  const aktif = rows.filter(
    (r) => r.status !== "iptal_edildi" && r.delivery_status !== "teslim_edildi",
  );

  return (
    <>
      <PageHeader
        title="Teslimat"
        description="Çekimi yapılmış işlerin seçim, düzenleme ve teslim takibi."
      />
      <PageBody>
        {error ? (
          <ErrorState message={error} />
        ) : aktif.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="Teslim bekleyen iş yok"
            description={
              rows.length === 0
                ? "Çekimi yapılmış bir organizasyon olduğunda burada görünecek."
                : "Geçmiş işlerin tamamı teslim edildi."
            }
          />
        ) : (
          <DeliveryBoard rows={aktif} />
        )}
      </PageBody>
    </>
  );
}
