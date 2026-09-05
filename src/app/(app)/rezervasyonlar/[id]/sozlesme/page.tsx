import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReservationById } from "@/lib/queries";
import { todayISO } from "@/lib/time";
import {
  buildContractSnapshot,
  contractVariableValues,
  renderContractBody,
} from "@/lib/contracts";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/shared/error-state";
import type { Contract, ContractTemplate, Customer } from "@/lib/database.types";
import { ContractWorkspace } from "./contract-workspace";

export const metadata: Metadata = { title: "Sözleşme" };

export default async function ContractPage({
  params,
}: PageProps<"/rezervasyonlar/[id]/sozlesme">) {
  const { id } = await params;
  const { profile, business } = await requireSession();

  if (!canSeeFinance(profile)) {
    return (
      <>
        <PageHeader
          title="Sözleşme"
          back={{ href: `/rezervasyonlar/${id}`, label: "Rezervasyona dön" }}
        />
        <PageBody>
          <ErrorState message="Sözleşmeleri görüntülemek için finansal yetki gerekir." />
        </PageBody>
      </>
    );
  }

  const supabase = await createClient();
  const [reservationResult, customerResult, templateResult, contractResult] =
    await Promise.all([
      getReservationById(id),
      supabase.from("customers").select("*").returns<Customer[]>(),
      supabase
        .from("contract_templates")
        .select("*")
        .eq("is_default", true)
        .maybeSingle<ContractTemplate>(),
      // En güncel sürüm; eski sürümler tarihçede kalır.
      supabase
        .from("contracts")
        .select("*")
        .eq("reservation_id", id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle<Contract>(),
    ]);

  if (reservationResult.error) {
    return (
      <>
        <PageHeader
          title="Sözleşme"
          back={{ href: `/rezervasyonlar/${id}`, label: "Rezervasyona dön" }}
        />
        <PageBody>
          <ErrorState message={reservationResult.error} />
        </PageBody>
      </>
    );
  }

  const reservation = reservationResult.reservation;
  if (!reservation) notFound();

  const customer = (customerResult.data ?? []).find(
    (c) => c.id === reservation.customer_id,
  );
  if (!customer) notFound();

  // Güncel veriden hazırlanan taslak. Kaydedilmiş sözleşme varsa bu yalnızca
  // "yeniden oluştur" seçildiğinde kullanılır — mevcut sözleşme değişmez.
  const draftSnapshot = buildContractSnapshot({
    business,
    customer,
    reservation,
    profile,
    today: todayISO(),
  });

  const templateBody = templateResult.data?.body ?? "";
  const draftContent = templateBody
    ? renderContractBody(
        templateBody,
        contractVariableValues(draftSnapshot, "—"),
      )
    : "";

  return (
    <>
      <PageHeader
        title="Rezervasyon sözleşmesi"
        description={`${customer.full_name} · ${reservation.venue?.name ?? ""}`}
        back={{ href: `/rezervasyonlar/${id}`, label: "Rezervasyona dön" }}
      />
      <PageBody>
        <ContractWorkspace
          reservationId={id}
          customerName={customer.full_name}
          customerPhone={customer.phone}
          eventDate={reservation.event_date}
          contract={contractResult.data ?? null}
          templateBody={templateBody}
          draftSnapshot={draftSnapshot}
          draftContent={draftContent}
        />
      </PageBody>
    </>
  );
}
