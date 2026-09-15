import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { vertical } from "@/lib/vertical";
import { ErrorState } from "@/components/shared/error-state";
import { VENUE_COLORS } from "@/lib/constants";
import type { Team } from "@/lib/database.types";
import { TeamFormDialog } from "./team-form-dialog";
import { TeamList } from "./team-list";

export const metadata: Metadata = { title: "Ekipler" };

export default async function TeamsPage() {
  const { business } = await requireSession();
  const sozluk = vertical(business.business_type);
  // Ekip yalnızca fotoğrafçıda var; salonda menüde de yok, adrese yazılsa da açılmıyor.
  if (!sozluk.usesTeams) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name")
    .returns<Team[]>();

  const teams = data ?? [];

  return (
    <>
      <PageHeader
        title="Ekipler"
        description="Çekimi kimin yapacağı. Atama zorunlu değil, sonradan da yapılabilir."
        actions={
          <TeamFormDialog
            suggestedColor={VENUE_COLORS[teams.length % VENUE_COLORS.length]}
            triggerButton={{ label: "Yeni ekip", icon: "plus" }}
          />
        }
      />
      <PageBody>
        {error ? <ErrorState message={error.message} /> : <TeamList teams={teams} />}
      </PageBody>
    </>
  );
}
