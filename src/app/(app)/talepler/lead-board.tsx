"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { LeadStatusBadge } from "@/components/shared/lead-status-badge";
import {
  LEAD_PIPELINE,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  ORGANIZATION_TYPE_LABELS,
} from "@/lib/constants";
import { formatDateShort, formatMoney, formatNumber } from "@/lib/format";
import { relativeDay } from "@/lib/relative-date";
import type { LeadRow } from "@/lib/leads";
import type { Profile, Venue } from "@/lib/database.types";
import { MessagesSquare } from "lucide-react";
import { LeadCard } from "./lead-card";

const ALL = "hepsi";

export function LeadBoard({
  leads,
  venues,
  members,
}: {
  leads: LeadRow[];
  venues: Venue[];
  members: Pick<Profile, "id" | "full_name">[];
}) {
  // Tek görünüm var: liste. Dar ekranda tablo yerine kart yığını.
  const narrow = useNarrowScreen();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [venue, setVenue] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [assignee, setAssignee] = useState(ALL);
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("tr");
    return leads.filter((lead) => {
      if (status !== ALL && lead.status !== status) return false;
      if (type !== ALL && lead.organization_type !== type) return false;
      if (venue !== ALL && lead.venue_id !== venue) return false;
      if (source !== ALL && lead.source !== source) return false;
      if (assignee !== ALL && lead.assigned_to !== assignee) return false;
      if (!needle) return true;

      // Arama: müşteri adı, telefon ve organizasyon tarihi.
      const haystack = [
        lead.customer?.full_name,
        lead.customer?.phone,
        lead.event_date,
        lead.event_date ? formatDateShort(lead.event_date) : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr");
      return haystack.includes(needle);
    });
  }, [leads, search, status, type, venue, source, assignee]);

  const filtersActive =
    search !== "" ||
    [status, type, venue, source, assignee].some((v) => v !== ALL);


  return (
    <div className="space-y-4">
      {/* Filtre şeridi */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[13rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Müşteri, telefon veya tarih ara…"
            className="pl-9"
          />
        </div>

        <FilterSelect
          value={venue}
          onChange={setVenue}
          placeholder="Salon"
          options={venues.map((v) => ({ value: v.id, label: v.name }))}
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="Durum"
          options={LEAD_PIPELINE.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))}
        />
        <FilterSelect
          value={type}
          onChange={setType}
          placeholder="Tür"
          options={Object.entries(ORGANIZATION_TYPE_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        {members.length > 1 && (
          <FilterSelect
            value={assignee}
            onChange={setAssignee}
            placeholder="Sorumlu"
            options={members.map((m) => ({ value: m.id, label: m.full_name }))}
          />
        )}
        <FilterSelect
          value={source}
          onChange={setSource}
          placeholder="Kaynak"
          options={Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />

        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatus(ALL);
              setType(ALL);
              setVenue(ALL);
              setSource(ALL);
              setAssignee(ALL);
            }}
          >
            <X />
            Temizle
          </Button>
        )}

      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title={filtersActive ? "Eşleşen talep yok" : "Henüz talep yok"}
          description={
            filtersActive
              ? "Filtreleri değiştirerek tekrar deneyin."
              : "Müşteri aradığında \"Yeni talep\" ile kaydı buradan açabilirsiniz."
          }
        />
      ) : (
        <ListView leads={filtered} narrow={narrow} />
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-auto min-w-[8.5rem]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}: hepsi</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}


function ListView({ leads, narrow }: { leads: LeadRow[]; narrow: boolean }) {
  const router = useRouter();

  // Telefonda 7 sütunlu tablo yatay kaydırma demek ve durumu değiştirmenin
  // yolu yok. Aynı veriyi kartla göstermek hem okunaklı, hem kartın kendi
  // "Durumu değiştir" menüsü geliyor.
  if (narrow) {
    return (
      <div className="space-y-2.5">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} showStatus />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm">
          <tr className="text-left text-xs text-muted-foreground">
            <Th>Müşteri</Th>
            <Th>Organizasyon</Th>
            <Th>Salon</Th>
            <Th className="text-right">Kişi</Th>
            <Th className="text-right">Teklif</Th>
            <Th>Son görüşme</Th>
            <Th>Durum</Th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {leads.map((lead) => (
            <tr
              key={lead.id}
              onClick={() => router.push(`/talepler/${lead.id}`)}
              className="cursor-pointer hover:bg-muted/40"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/talepler/${lead.id}`}
                  className="font-medium hover:underline"
                >
                  {lead.customer?.full_name ?? "—"}
                </Link>
                <span className="tabular block text-xs text-muted-foreground">
                  {lead.customer?.phone}
                </span>
              </td>
              <td className="px-4 py-3">
                {ORGANIZATION_TYPE_LABELS[lead.organization_type]}
                <span className="block text-xs text-muted-foreground">
                  {lead.event_date ? formatDateShort(lead.event_date) : "Tarih belirsiz"}
                </span>
              </td>
              <td className="px-4 py-3">{lead.venue?.name ?? "—"}</td>
              <td className="tabular px-4 py-3 text-right">
                {lead.guest_count ? formatNumber(lead.guest_count) : "—"}
              </td>
              <td className="tabular px-4 py-3 text-right font-medium">
                {lead.quote_amount !== null ? formatMoney(lead.quote_amount) : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {relativeDay(lead.last_contact_at)}
              </td>
              <td className="px-4 py-3">
                <LeadStatusBadge status={lead.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-4 py-2.5 font-medium ${className ?? ""}`}>{children}</th>
  );
}

const NARROW = "(max-width: 768px)";

/**
 * Ekran dar mı? useSyncExternalStore ile: effect içinde setState çağırmadan,
 * sunucuda da güvenli (sunucu anlık görüntüsü her zaman false).
 */
function useNarrowScreen(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(NARROW);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}
