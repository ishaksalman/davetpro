import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Phone } from "lucide-react";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLookups } from "@/lib/queries";
import { getLeadById } from "@/lib/leads";
import {
  LEAD_LOST_REASON_LABELS,
  LEAD_SOURCE_LABELS,
  ORGANIZATION_TYPE_LABELS,
} from "@/lib/constants";
import {
  formatDate,
  formatDateLong,
  formatNumber,
  formatPhone,
  formatTimeRange,
} from "@/lib/format";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { LeadStatusBadge } from "@/components/shared/lead-status-badge";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { Button } from "@/components/ui/button";
import type {
  LeadActivity,
  Profile,
  Quote,
  QuoteItem,
  VenueHold,
} from "@/lib/database.types";
import { ActivityTimeline } from "./activity-timeline";
import { HoldPanel } from "./hold-panel";
import { LeadActions } from "./lead-actions";
import { QuotePanel } from "./quote-panel";

export const metadata: Metadata = { title: "Talep" };

export default async function LeadDetailPage({
  params,
}: PageProps<"/talepler/[id]">) {
  const { id } = await params;
  const { profile } = await requireSession();
  const showFinance = canSeeFinance(profile);

  const supabase = await createClient();
  const [
    leadResult,
    lookups,
    activitiesResult,
    quotesResult,
    itemsResult,
    holdsResult,
    membersResult,
  ] = await Promise.all([
    getLeadById(id),
    getLookups(),
    supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", id)
      .order("occurred_at", { ascending: false })
      .returns<LeadActivity[]>(),
    supabase
      .from("quotes")
      .select("*")
      .eq("lead_id", id)
      .order("version", { ascending: false })
      .returns<Quote[]>(),
    supabase.from("quote_items").select("*").order("sort_order").returns<QuoteItem[]>(),
    supabase
      .from("venue_holds")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .returns<VenueHold[]>(),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name")
      .returns<Pick<Profile, "id" | "full_name">[]>(),
  ]);

  if (leadResult.error) {
    return (
      <>
        <PageHeader title="Talep" back={{ href: "/talepler", label: "Görüşmeler" }} />
        <PageBody>
          <ErrorState message={leadResult.error} />
        </PageBody>
      </>
    );
  }

  const lead = leadResult.lead;
  if (!lead) notFound();

  const customer = lookups.customers.find((c) => c.id === lead.customer_id);
  const quotes = quotesResult.data ?? [];
  const items = itemsResult.data ?? [];
  const holds = holdsResult.data ?? [];
  const activeHold = holds.find((h) => h.status === "aktif");
  const members = membersResult.data ?? [];
  const acceptedQuote = quotes.find((q) => q.status === "kabul");
  const latestQuote = quotes[0] ?? null;

  return (
    <>
      <PageHeader
        title={customer?.full_name ?? "Talep"}
        description={
          lead.event_date
            ? `${formatDateLong(lead.event_date)}${lead.venue ? ` · ${lead.venue.name}` : ""}`
            : "Tarih henüz belirsiz"
        }
        back={{ href: "/talepler", label: "Tüm görüşmeler" }}
        actions={
          <LeadActions
            lead={lead}
            venues={lookups.venues}
            packages={lookups.packages}
            members={members}
            customerName={customer?.full_name ?? ""}
            customerPhone={customer?.phone ?? ""}
            activeHold={activeHold ?? null}
            quotes={quotes}
            acceptedQuoteId={acceptedQuote?.id ?? latestQuote?.id ?? null}
            showFinance={showFinance}
          />
        }
      />

      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-6">
            {/* Genel bilgiler */}
            <section className="rounded-xl border bg-card">
              <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
                <h2 className="font-medium">Genel bilgiler</h2>
                <LeadStatusBadge status={lead.status} />
              </header>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3">
                <Detail label="Tür">
                  {ORGANIZATION_TYPE_LABELS[lead.organization_type]}
                </Detail>
                <Detail label="Kaynak">{LEAD_SOURCE_LABELS[lead.source]}</Detail>
                <Detail label="Salon">{lead.venue?.name ?? "Belirsiz"}</Detail>
                <Detail label="Tarih">
                  {lead.event_date ? formatDate(lead.event_date) : "Belirsiz"}
                </Detail>
                <Detail label="Alternatif tarih">
                  {lead.alt_event_date ? formatDate(lead.alt_event_date) : "—"}
                </Detail>
                <Detail label="Saat">
                  {lead.start_time && lead.end_time
                    ? formatTimeRange(lead.start_time, lead.end_time)
                    : "—"}
                </Detail>
                <Detail label="Kişi sayısı">
                  {lead.guest_count ? `${formatNumber(lead.guest_count)} kişi` : "—"}
                </Detail>
                <Detail label="Paket">{lead.package?.name ?? "Belirsiz"}</Detail>
                <Detail label="Sorumlu">{lead.assignee_name ?? "Atanmadı"}</Detail>
              </dl>

              {lead.notes && (
                <div className="border-t px-5 py-4">
                  <p className="text-xs text-muted-foreground">Notlar</p>
                  <p className="mt-1 text-sm whitespace-pre-line">{lead.notes}</p>
                </div>
              )}

              {lead.status === "kaybedildi" && lead.lost_reason && (
                <div className="border-t bg-muted/40 px-5 py-4">
                  <p className="text-xs text-muted-foreground">Kaybetme nedeni</p>
                  <p className="mt-1 text-sm">
                    {LEAD_LOST_REASON_LABELS[lead.lost_reason]}
                    {lead.lost_note && ` — ${lead.lost_note}`}
                  </p>
                </div>
              )}

              {lead.reservation_id && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-emerald-500/5 px-5 py-4">
                  <p className="text-sm">
                    Bu talep{" "}
                    {lead.converted_at && formatDate(lead.converted_at)} tarihinde
                    rezervasyona dönüştürüldü.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/rezervasyonlar/${lead.reservation_id}`}>
                      <ExternalLink />
                      Rezervasyonu görüntüle
                    </Link>
                  </Button>
                </div>
              )}
            </section>

            {/* Teklifler */}
            <QuotePanel
              leadId={lead.id}
              quotes={quotes}
              items={items}
              venues={lookups.venues}
              packages={lookups.packages}
              defaults={{
                venue_id: lead.venue_id,
                package_id: lead.package_id,
                guest_count: lead.guest_count,
              }}
              customerPhone={customer?.phone ?? ""}
              customerName={customer?.full_name ?? ""}
              eventDate={lead.event_date}
              showFinance={showFinance}
              locked={Boolean(lead.reservation_id)}
            />

            {/* Görüşme geçmişi */}
            <ActivityTimeline
              leadId={lead.id}
              activities={activitiesResult.data ?? []}
              members={members}
            />
          </div>

          {/* Sağ sütun */}
          <aside className="space-y-6">
            {customer && (
              <section className="rounded-xl border bg-card p-5">
                <h2 className="font-medium">Müşteri</h2>
                <Link
                  href={`/musteriler/${customer.id}`}
                  className="mt-2 block text-sm font-medium hover:underline"
                >
                  {customer.full_name}
                </Link>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={`tel:${customer.phone}`}
                      className="tabular flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="size-3.5" />
                      {formatPhone(customer.phone)}
                    </a>
                    <WhatsAppButton
                      phone={customer.phone}
                      message={`Merhaba ${customer.full_name}, organizasyonunuz hakkında yazıyorum.`}
                    />
                  </div>
                  {customer.email && (
                    <a
                      href={`mailto:${customer.email}`}
                      className="block truncate text-muted-foreground hover:text-foreground"
                    >
                      {customer.email}
                    </a>
                  )}
                </div>
              </section>
            )}

            <HoldPanel
              leadId={lead.id}
              holds={holds}
              venues={lookups.venues}
              defaults={{
                venue_id: lead.venue_id,
                event_date: lead.event_date,
                start_time: lead.start_time,
                end_time: lead.end_time,
              }}
              locked={Boolean(lead.reservation_id)}
            />
          </aside>
        </div>
      </PageBody>
    </>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}
