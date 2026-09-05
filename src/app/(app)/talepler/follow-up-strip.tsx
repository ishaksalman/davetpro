import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { formatTime } from "@/lib/format";
import { todayISO } from "@/lib/time";
import type { LeadRow } from "@/lib/leads";

/**
 * "Bugün takip edilecekler": satış personelinin müşteriyi unutmaması için.
 * Geçmiş tarihli takipler de burada; aksi halde sessizce kaybolurlardı.
 */
export function FollowUpStrip({ leads }: { leads: LeadRow[] }) {
  const today = todayISO();
  const due = leads
    .filter(
      (lead) =>
        lead.next_follow_up_at !== null &&
        lead.status !== "kazanildi" &&
        lead.status !== "kaybedildi" &&
        lead.next_follow_up_at.slice(0, 10) <= today,
    )
    .sort((a, b) => (a.next_follow_up_at! < b.next_follow_up_at! ? -1 : 1));

  if (due.length === 0) return null;

  return (
    <section className="rounded-xl border border-primary/25 bg-primary/5 p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <CalendarClock className="size-4 text-primary" />
        Bugün takip edilecekler
        <span className="tabular rounded-full bg-primary/10 px-2 py-0.5 text-xs">
          {due.length}
        </span>
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {due.map((lead) => (
          <li key={lead.id}>
            <Link
              href={`/talepler/${lead.id}`}
              className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/40"
            >
              <span className="font-medium">{lead.customer?.full_name}</span>
              <span className="tabular text-xs text-muted-foreground">
                {formatTime(lead.next_follow_up_at!.slice(11, 16))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
