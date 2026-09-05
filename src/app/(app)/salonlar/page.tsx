import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { VENUE_COLORS } from "@/lib/constants";
import type { Venue } from "@/lib/database.types";
import { VenueFormDialog } from "./venue-form-dialog";
import { VenueList } from "./venue-list";

export const metadata: Metadata = { title: "Salonlar" };

export default async function VenuesPage() {
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
        title="Salonlar"
        description="Her rezervasyon bir salonla ilişkilendirilir."
        actions={
          <VenueFormDialog
            suggestedColor={VENUE_COLORS[venues.length % VENUE_COLORS.length]}
            triggerButton={{ label: "Yeni salon", icon: "plus" }}
          />
        }
      />
      <PageBody>
        {error ? <ErrorState message={error.message} /> : <VenueList venues={venues} />}
      </PageBody>
    </>
  );
}
