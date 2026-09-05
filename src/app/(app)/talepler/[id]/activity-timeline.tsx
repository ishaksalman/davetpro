"use client";

import { useState, useTransition } from "react";
import {
  Camera,
  Mail,
  MessageCircle,
  Phone,
  Settings2,
  StickyNote,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_ACTIVITY_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { LeadActivity, LeadActivityType, Profile } from "@/lib/database.types";
import { addLeadActivity } from "../actions";

const ICONS: Record<LeadActivityType, typeof Phone> = {
  telefon: Phone,
  whatsapp: MessageCircle,
  instagram: Camera,
  yuz_yuze: Users,
  eposta: Mail,
  not: StickyNote,
  sistem: Settings2,
};

/** Kullanıcının elle ekleyebileceği türler; "sistem" yalnızca trigger'lardan gelir. */
type ManualType = Exclude<LeadActivityType, "sistem">;

const MANUAL_TYPES: ManualType[] = [
  "telefon",
  "whatsapp",
  "instagram",
  "yuz_yuze",
  "eposta",
  "not",
];

/**
 * Görüşme geçmişi. Kullanıcının eklediği kayıtlar ile sistemin otomatik
 * yazdıkları (durum değişikliği, teklif, opsiyon) aynı akışta ama görsel
 * olarak ayrışıyor.
 */
export function ActivityTimeline({
  leadId,
  activities,
  members,
}: {
  leadId: string;
  activities: LeadActivity[];
  members: Pick<Profile, "id" | "full_name">[];
}) {
  const [type, setType] = useState<ManualType>("telefon");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const guard = useSubmitGuard();

  const people = new Map(members.map((m) => [m.id, m.full_name] as const));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (note.trim().length < 2) {
      toast.error("Görüşme notunu yazın.");
      return;
    }
    if (!guard.begin()) return;

    startTransition(async () => {
      try {
        const result = await addLeadActivity({ lead_id: leadId, type, note });
        if (result.ok) {
          setNote("");
          toast.success("Görüşme kaydedildi.");
        } else {
          toast.error(result.error);
        }
      } finally {
        guard.end();
      }
    });
  }

  return (
    <section className="rounded-xl border bg-card">
      <header className="border-b px-5 py-4">
        <h2 className="font-medium">Görüşme geçmişi</h2>
        <p className="text-xs text-muted-foreground">
          {activities.filter((a) => !a.is_system).length} görüşme kaydı
        </p>
      </header>

      <form onSubmit={submit} className="space-y-3 border-b px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <Select value={type} onValueChange={(v) => setType(v as ManualType)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MANUAL_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {LEAD_ACTIVITY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Müşteri 450 kişilik Gold Paket fiyatı istedi…"
        />
        <Button type="submit" size="sm" disabled={pending}>
          Görüşmeyi kaydet
        </Button>
      </form>

      {activities.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          Henüz kayıt yok.
        </p>
      ) : (
        <ol className="divide-y">
          {activities.map((activity) => {
            const Icon = ICONS[activity.type];
            return (
              <li key={activity.id} className="flex gap-3 px-5 py-3.5">
                <span
                  className={
                    activity.is_system
                      ? "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                      : "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                  }
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span>{formatDateTime(activity.occurred_at)}</span>
                    <span>·</span>
                    <span>
                      {activity.is_system
                        ? "Sistem"
                        : LEAD_ACTIVITY_LABELS[activity.type]}
                    </span>
                    {!activity.is_system && activity.created_by && (
                      <>
                        <span>·</span>
                        <span>{people.get(activity.created_by) ?? "—"}</span>
                      </>
                    )}
                  </p>
                  <p
                    className={
                      activity.is_system
                        ? "mt-0.5 text-sm text-muted-foreground"
                        : "mt-0.5 text-sm whitespace-pre-line"
                    }
                  >
                    {activity.note}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
