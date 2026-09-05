import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { getLookups, getReservationRows } from "@/lib/queries";
import { getActiveHolds, getCalendarLeads } from "@/lib/leads";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Notice } from "@/components/shared/notice";
import { Button } from "@/components/ui/button";
import { CalendarView } from "./calendar-view";

export const metadata: Metadata = { title: "Takvim" };

export default async function CalendarPage() {
  const { profile } = await requireSession();
  const [lookups, { rows, error, truncated }, holds, leads] = await Promise.all([
    getLookups(),
    getReservationRows({}),
    // Opsiyon ve talepler takvimde kesin rezervasyondan ayrı görünür.
    getActiveHolds(),
    getCalendarLeads(),
  ]);

  const activeVenues = lookups.venues.filter((v) => v.is_active);

  return (
    <>
      <PageHeader
        title="Takvim"
        description="Boş günleri görün, boş bir güne tıklayarak rezervasyon oluşturun."
      />
      <PageBody>
        {error ? (
          <ErrorState message={error} />
        ) : activeVenues.length === 0 ? (
          <EmptyState
            icon={Store}
            title="Önce bir salon tanımlayın"
            description="Takvim, salonlara göre renklendirilmiş rezervasyonları gösterir."
            action={
              <Button asChild>
                <Link href="/salonlar">Salon ekle</Link>
              </Button>
            }
          />
        ) : (
          <>
            {truncated && (
              <Notice>
                Takvim üst sınıra ulaştı; bazı organizasyonlar görünmüyor olabilir.
              </Notice>
            )}
            <CalendarView
            reservations={rows}
            holds={holds}
            leads={leads}
            customers={lookups.customers}
            venues={activeVenues}
            packages={lookups.packages}
              showFinance={canSeeFinance(profile)}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
