import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { contractFileName } from "@/lib/contracts";
import { formatDate } from "@/lib/format";
import { ContractDocument } from "@/components/contracts/contract-document";
import { DocumentFrame } from "@/components/contracts/document-frame";
import type { SharedContract } from "@/lib/database.types";
import { PrintButton } from "./print-button";

// Kişisel veri içeren bir belge: dizine girmesin, bağlantı önizlemesi
// sözleşmenin içeriğini göstermesin.
export const metadata: Metadata = {
  title: "Sözleşme",
  robots: { index: false, follow: false },
};

/**
 * Müşterinin WhatsApp'tan gelen bağlantıyla açtığı sözleşme (/s/<kod>).
 *
 * Giriş gerektirmiyor; veri contract_by_share_token ile yalnızca kodu bilinen
 * sözleşme için geliyor (0047). Aynı rezervasyonun en güncel sürümü
 * gösteriliyor; iptal edildiyse belge yine görünüyor ama üstte belirtiliyor.
 */
export default async function SharedContractPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("contract_by_share_token", { p_token: token })
    .maybeSingle<SharedContract>();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const fileName = contractFileName(data.contract_number, data.snapshot.customer.full_name);
  const cancelled = data.status === "iptal";

  return (
    <main className="min-h-svh bg-neutral-100 print:bg-white">
      <title>{fileName}</title>
      <header className="no-print sticky top-0 z-10 border-b bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{data.snapshot.business.name}</p>
            <p className="text-xs text-neutral-500">
              Sözleşme {data.contract_number}
              {data.signed_at ? ` · İmzalandı ${formatDate(data.signed_at)}` : ""}
            </p>
          </div>
          <PrintButton />
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-4 p-3 sm:p-6">
        {cancelled && (
          <p className="no-print rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            Bu sözleşme iptal edilmiştir. Güncel bir sözleşme için işletmeyle görüşün.
          </p>
        )}
        <DocumentFrame>
          <ContractDocument
            snapshot={data.snapshot}
            content={data.content}
            contractNumber={data.contract_number}
          />
        </DocumentFrame>
      </div>
    </main>
  );
}
