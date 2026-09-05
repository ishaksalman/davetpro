import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/shared/error-state";
import type { Package, Venue } from "@/lib/database.types";
import { PackageFormDialog } from "./package-form-dialog";
import { PackageList } from "./package-list";

export const metadata: Metadata = { title: "Paketler" };

export default async function PackagesPage() {
  const supabase = await createClient();
  const [{ data, error }, venuesResult] = await Promise.all([
    supabase
      .from("packages")
      .select("*")
      .order("is_active", { ascending: false })
      .order("base_price", { ascending: false })
      .returns<Package[]>(),
    // Paket bir salona bağlanabildiği için salon listesi de gerekiyor.
    supabase
      .from("venues")
      .select("*")
      .order("name")
      .returns<Venue[]>(),
  ]);

  const venues = venuesResult.data ?? [];

  return (
    <>
      <PageHeader
        title="Paketler"
        description="Salonunuzun hazır fiyat paketleri."
        actions={
          <PackageFormDialog
            venues={venues}
            triggerButton={{ label: "Yeni paket", icon: "plus" }}
          />
        }
      />
      <PageBody>
        {error ? (
          <ErrorState message={error.message} />
        ) : (
          <PackageList packages={data ?? []} venues={venues} />
        )}
      </PageBody>
    </>
  );
}
