import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { vertical } from "@/lib/vertical";
import { ErrorState } from "@/components/shared/error-state";
import { VENUE_COLORS } from "@/lib/constants";
import type { Venue } from "@/lib/database.types";
import { VenueFormDialog } from "./venue-form-dialog";
import { VenueList } from "./venue-list";

// Başlık sabit: metadata oturum okuyamıyor, tipe göre değişemiyor.
export const metadata: Metadata = { title: "Salonlar" };

export default async function VenuesPage() {
  const { business } = await requireSession();
  const sozluk = vertical(business.business_type);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name")
    .returns<Venue[]>();

  const venues = data ?? [];

  return (
    <>
      <PageHeader
        title={sozluk.resource.plural}
        description={`Her rezervasyon bir ${sozluk.resource.singular.toLocaleLowerCase("tr-TR")} ile ilişkilendirilir.`}
        actions={
          <VenueFormDialog
            suggestedColor={VENUE_COLORS[venues.length % VENUE_COLORS.length]}
            triggerButton={{ label: sozluk.resourceNew, icon: "plus" }}
          />
        }
      />
      <PageBody>
        {error ? <ErrorState message={error.message} /> : <VenueList venues={venues} />}
      </PageBody>
    </>
  );
}
