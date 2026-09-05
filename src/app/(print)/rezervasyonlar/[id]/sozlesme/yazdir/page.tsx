import { notFound } from "next/navigation";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { contractFileName } from "@/lib/contracts";
import { ContractDocument } from "@/components/contracts/contract-document";
import type { Contract } from "@/lib/database.types";
import { PrintTrigger } from "@/components/contracts/print-trigger";

/**
 * Sözleşmenin baskı görünümü.
 *
 * PDF, tarayıcının kendi "PDF olarak kaydet" çıktısıyla üretiliyor; ayrı bir
 * PDF kütüphanesi eklenmedi. Türkçe karakterler böylece sayfadaki fontla
 * birebir basılıyor ve sayfa sonu kuralları CSS'ten yönetiliyor.
 */
export default async function ContractPrintPage({
  params,
  searchParams,
}: PageProps<"/rezervasyonlar/[id]/sozlesme/yazdir">) {
  const { id } = await params;
  const { hedef } = await searchParams;

  const { profile } = await requireSession();
  if (!canSeeFinance(profile)) notFound();

  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("reservation_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle<Contract>();

  if (!contract) notFound();

  // Başlık, tarayıcının "PDF olarak kaydet" akışında dosya adı olarak önerilir.
  const fileName = contractFileName(
    contract.contract_number,
    contract.snapshot.customer.full_name,
  );

  return (
    <>
      <title>{fileName}</title>
      <PrintTrigger fileName={fileName} savingPdf={hedef === "pdf"} />
      <ContractDocument
        snapshot={contract.snapshot}
        content={contract.content}
        contractNumber={contract.contract_number}
      />
    </>
  );
}
