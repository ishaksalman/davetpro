"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_LOST_REASON_LABELS } from "@/lib/constants";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { LeadLostReason } from "@/lib/database.types";
import { markLeadLost } from "../actions";

/**
 * Kaybetme nedeni zorunlu: "bu ay neden müşteri kaybettik?" sorusunu
 * sonradan cevaplayabilmek için tek veri kaynağı bu.
 */
export function LostDialog({
  leadId,
  trigger,
}: {
  leadId: string;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<LeadLostReason>("fiyat");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const guard = useSubmitGuard();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (reason === "diger" && note.trim().length < 3) {
      setError("\"Diğer\" seçtiğinizde kısa bir açıklama yazın.");
      return;
    }
    setError(null);
    if (!guard.begin()) return;

    startTransition(async () => {
      try {
        const result = await markLeadLost({
          lead_id: leadId,
          lost_reason: reason,
          lost_note: note,
        });
        if (result.ok) {
          toast.success("Talep kaybedildi olarak işaretlendi.");
          setOpen(false);
        } else {
          toast.error(result.error);
        }
      } finally {
        guard.end();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Talep kaybedildi</DialogTitle>
          <DialogDescription>
            Neden kaybettiğinizi kaydedin; ilerleyen dönemde bu veriden rapor
            çıkaracağız.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lost_reason">Neden</Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as LeadLostReason)}
            >
              <SelectTrigger id="lost_reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEAD_LOST_REASON_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lost_note">
              Açıklama {reason === "diger" ? "" : "(opsiyonel)"}
            </Label>
            <Textarea
              id="lost_note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Kısa açıklama…"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Kaybedildi olarak işaretle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
