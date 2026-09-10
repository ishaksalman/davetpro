import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { requireSessionAllowExpired } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AdminBusinessRow } from "@/lib/database.types";
import { SubscriptionTable } from "./subscription-table";

export const metadata: Metadata = {
  title: "Abonelikler",
  robots: { index: false, follow: false },
};

/**
 * Platform yönetimi: hangi işletmenin süresi ne zaman doluyor, elle uzatma.
 *
 * Kiracıya ait bir ekran değil. Yetkisi olmayana notFound(): yönlendirme
 * sayfanın varlığını doğrular, 404 doğrulamaz.
 */
export default async function YonetimPage() {
  const { isPlatformAdmin } = await requireSessionAllowExpired();
  if (!isPlatformAdmin) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_businesses");

  return (
    <>
      <PageHeader
        title="Abonelikler"
        description="Süresi en yakında dolan işletme en üstte."
      />
      <PageBody>
        {error ? (
          <ErrorState message={error.message} />
        ) : (
          <SubscriptionTable rows={(data as AdminBusinessRow[] | null) ?? []} />
        )}
      </PageBody>
    </>
  );
}
