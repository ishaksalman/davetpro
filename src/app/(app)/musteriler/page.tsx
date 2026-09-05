import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/shared/error-state";
import type { Customer, CustomerBalance } from "@/lib/database.types";
import { CustomerFormDialog } from "./customer-form-dialog";
import { CustomerTable, type CustomerRow } from "./customer-table";

export const metadata: Metadata = { title: "Müşteriler" };

export default async function CustomersPage() {
  const { profile } = await requireSession();
  const supabase = await createClient();

  // Bakiyeler ayrı bir view'dan gelir; finans yetkisi yoksa RLS bu satırları
  // zaten sıfırlar. İki liste istemciye birleştirilmiş halde gider.
  const [customersResult, balancesResult] = await Promise.all([
    supabase.from("customers").select("*").order("full_name").returns<Customer[]>(),
    supabase.from("customer_balances").select("*").returns<CustomerBalance[]>(),
  ]);

  const balances = new Map(
    (balancesResult.data ?? []).map((b) => [b.customer_id, b]),
  );
  const rows: CustomerRow[] = (customersResult.data ?? []).map((customer) => ({
    ...customer,
    balance: balances.get(customer.id),
  }));

  return (
    <>
      <PageHeader
        title="Müşteriler"
        description={`${rows.length} kayıtlı müşteri`}
        actions={
          <CustomerFormDialog
            triggerButton={{ label: "Yeni müşteri", icon: "plus" }}
          />
        }
      />
      <PageBody>
        {customersResult.error ? (
          <ErrorState message={customersResult.error.message} />
        ) : (
          <CustomerTable customers={rows} showFinance={canSeeFinance(profile)} />
        )}
      </PageBody>
    </>
  );
}
