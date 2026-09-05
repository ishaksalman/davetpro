import { notFound } from "next/navigation";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLookups } from "@/lib/queries";
import { QuoteDocument } from "@/components/contracts/quote-document";
import { PrintTrigger } from "@/components/contracts/print-trigger";
import type { Lead, Quote, QuoteItem } from "@/lib/database.types";

/**
 * Teklifin baskı görünümü. PDF, sözleşmede olduğu gibi tarayıcının kendi
 * "PDF olarak kaydet" çıktısıyla üretiliyor — ayrı bir PDF kütüphanesi yok,
 * Türkçe karakterler sayfadaki fontla birebir basılıyor.
 */
export default async function QuotePrintPage({
  params,
  searchParams,
}: PageProps<"/talepler/[id]/teklif/[quoteId]/yazdir">) {
  const { id, quoteId } = await params;
  const { hedef } = await searchParams;

  const { profile, business } = await requireSession();
  if (!canSeeFinance(profile)) notFound();

  const supabase = await createClient();
  const [quoteResult, itemsResult, leadResult, lookups] = await Promise.all([
    supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .eq("lead_id", id)
      .maybeSingle<Quote>(),
    supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("sort_order")
      .returns<QuoteItem[]>(),
    supabase.from("leads").select("*").eq("id", id).maybeSingle<Lead>(),
    getLookups(),
  ]);

  const quote = quoteResult.data;
  const lead = leadResult.data;
  if (!quote || !lead) notFound();

  const customer = lookups.customers.find((c) => c.id === lead.customer_id);
  const venueId = quote.venue_id ?? lead.venue_id;
  const venue = venueId ? lookups.venues.find((v) => v.id === venueId) : undefined;
  const pkg = quote.package_id
    ? lookups.packages.find((p) => p.id === quote.package_id)
    : undefined;

  const fileName = `Teklif-${quote.quote_number}`;

  return (
    <>
      <title>{fileName}</title>
      <PrintTrigger fileName={fileName} savingPdf={hedef === "pdf"} />
      <QuoteDocument
        business={business}
        quote={{
          quote_number: quote.quote_number,
          version: quote.version,
          created_at: quote.created_at,
          valid_until: quote.valid_until,
          package_name: pkg?.name ?? null,
          package_amount: quote.package_amount,
          discount_amount: quote.discount_amount,
          total_amount: quote.total_amount,
          items: (itemsResult.data ?? []).map((i) => ({
            id: i.id,
            name: i.name,
            amount: i.amount,
          })),
          notes: quote.notes,
          guest_count: quote.guest_count ?? lead.guest_count,
          customer_name: customer?.full_name ?? "—",
          customer_phone: customer?.phone ?? null,
          venue_name: venue?.name ?? null,
          organization_type: lead.organization_type,
          event_date: lead.event_date,
          start_time: lead.start_time,
          end_time: lead.end_time,
        }}
      />
    </>
  );
}
