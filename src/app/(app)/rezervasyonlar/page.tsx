import type { Metadata } from "next";
import { canSeeFinance, isAdmin, requireSession } from "@/lib/auth";
import { getLookups, getReservationRows } from "@/lib/queries";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { Notice } from "@/components/shared/notice";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";
import Link from "next/link";
import { ReservationFormDialog } from "./reservation-form-dialog";
import { ReservationTable } from "./reservation-table";

export const metadata: Metadata = { title: "Rezervasyonlar" };

export default async function ReservationsPage() {
  const { profile } = await requireSession();
  const [lookups, { rows, error, truncated }] = await Promise.all([
    getLookups(),
    getReservationRows({}),
  ]);

  const showFinance = canSeeFinance(profile);
  const hasVenue = lookups.venues.some((v) => v.is_active);

  return (
    <>
      <PageHeader
        title="Rezervasyonlar"
        description={`${rows.length} organizasyon kaydı`}
        actions={
          hasVenue && (
            <ReservationFormDialog
              customers={lookups.customers}
              venues={lookups.venues}
              packages={lookups.packages}
              showFinance={showFinance}
              triggerButton={{ label: "Yeni rezervasyon", icon: "plus" }}
            />
          )
        }
      />
      <PageBody>
        {error ? (
          <ErrorState message={error} />
        ) : !hasVenue ? (
          <EmptyState
            icon={Store}
            title="Önce bir salon tanımlayın"
            description="Rezervasyonlar mutlaka bir salonla ilişkilendirilir. Salonlarınızı ekledikten sonra buraya dönebilirsiniz."
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
                Liste üst sınıra ulaştı; bazı kayıtlar gösterilmiyor olabilir.
              </Notice>
            )}
            <ReservationTable
            reservations={rows}
            customers={lookups.customers}
            venues={lookups.venues}
            packages={lookups.packages}
            showFinance={showFinance}
              canDelete={isAdmin(profile)}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
