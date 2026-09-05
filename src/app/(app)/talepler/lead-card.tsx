"use client";

import Link from "next/link";
import { CalendarClock, Users } from "lucide-react";
import { LeadStatusBadge } from "@/components/shared/lead-status-badge";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { formatDateShort, formatMoney, formatNumber } from "@/lib/format";
import { relativeDay } from "@/lib/relative-date";
import type { LeadRow } from "@/lib/leads";

/**
 * Kanban kartı. Bilgiyle boğmamak için yalnızca satış görüşmesinde gereken
 * alanlar var: kim, ne, ne zaman, nerede, kaç kişi, kaç para, en son ne zaman
 * görüşüldü.
 */
export function LeadCard({
  lead,
  showStatus = false,
}: {
  lead: LeadRow;
  showStatus?: boolean;
}) {
  return (
    <article className="group rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/40">
      <Link href={`/talepler/${lead.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate font-medium group-hover:underline">
            {lead.customer?.full_name ?? "—"}
          </h3>
          {showStatus && <LeadStatusBadge status={lead.status} />}
        </div>

        <p className="mt-1 truncate text-sm text-muted-foreground">
          {ORGANIZATION_TYPE_LABELS[lead.organization_type]}
          {lead.event_date && ` · ${formatDateShort(lead.event_date)}`}
        </p>

        {(lead.venue || lead.guest_count) && (
          <p className="mt-0.5 flex items-center gap-2.5 truncate text-sm text-muted-foreground">
            {lead.venue && (
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: lead.venue.color }}
                />
                <span className="truncate">{lead.venue.name}</span>
              </span>
            )}
            {lead.guest_count && (
              <span className="flex shrink-0 items-center gap-1">
                <Users className="size-3.5" />
                {formatNumber(lead.guest_count)}
              </span>
            )}
          </p>
        )}

        {lead.quote_amount !== null && (
          <p className="tabular mt-2.5 font-semibold">
            {formatMoney(lead.quote_amount)}
          </p>
        )}

        <footer className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Son görüşme: {relativeDay(lead.last_contact_at)}</span>
          {lead.hold_expires_at && (
            <span className="text-orange-600 dark:text-orange-400">
              Opsiyon: {relativeDay(lead.hold_expires_at)}
            </span>
          )}
          {lead.follow_up_overdue && (
            <span className="flex items-center gap-1 font-medium text-destructive">
              <CalendarClock className="size-3.5" />
              Takip gecikti
            </span>
          )}
        </footer>
      </Link>

    </article>
  );
}
