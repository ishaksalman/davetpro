import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLookups } from "@/lib/queries";
import { getLeadRows } from "@/lib/leads";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Notice } from "@/components/shared/notice";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/database.types";
import { FollowUpStrip } from "./follow-up-strip";
import { LeadBoard } from "./lead-board";
import { LeadFormDialog } from "./lead-form-dialog";

export const metadata: Metadata = { title: "Görüşmeler" };

export default async function LeadsPage() {
  await requireSession();

  const supabase = await createClient();
  const [lookups, { rows, error, truncated }, membersResult] = await Promise.all([
    getLookups(),
    getLeadRows({}),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name")
      .returns<Pick<Profile, "id" | "full_name">[]>(),
  ]);

  const members = membersResult.data ?? [];
  const hasVenue = lookups.venues.some((v) => v.is_active);
  const open = rows.filter(
    (l) => l.status !== "kazanildi" && l.status !== "kaybedildi",
  );

  return (
    <>
      <PageHeader
        title="Görüşmeler"
        description={`${open.length} açık talep · ${rows.length} kayıt`}
        actions={
          <LeadFormDialog
            venues={lookups.venues}
            packages={lookups.packages}
            members={members}
            triggerButton={{ label: "Yeni talep", icon: "plus" }}
          />
        }
      />
      <PageBody>
        {error ? (
          <ErrorState message={error} />
        ) : !hasVenue && rows.length === 0 ? (
          <EmptyState
            icon={Store}
            title="Önce bir salon tanımlayın"
            description="Talep alırken müşteriye hangi salonu önerdiğinizi kaydedebilmek için en az bir salon gerekir."
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
                Liste üst sınıra ulaştı; bazı talepler gösterilmiyor olabilir.
              </Notice>
            )}
            <FollowUpStrip leads={rows} />
            <LeadBoard leads={rows} venues={lookups.venues} members={members} />
          </>
        )}
      </PageBody>
    </>
  );
}
