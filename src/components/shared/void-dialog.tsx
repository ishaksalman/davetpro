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
import { Textarea } from "@/components/ui/textarea";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { ActionResult } from "@/lib/action-result";

/**
 * Finansal kayıtlar silinmez, iptal edilir. İptal nedeni zorunludur —
 * kaydın neden geçersiz sayıldığı denetim izinde kalır.
 */
export function VoidDialog({
  trigger,
  title,
  description,
  onVoid,
  successMessage = "Kayıt iptal edildi.",
}: {
  /** DialogTrigger asChild ile Slot'a verilir: tek element olmalı. */
  trigger: React.ReactElement;
  title: string;
  description: React.ReactNode;
  onVoid: (reason: string) => Promise<ActionResult>;
  successMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const guard = useSubmitGuard();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setError("Lütfen iptal nedenini yazın (en az 3 karakter).");
      return;
    }
    setError(null);
    if (!guard.begin()) return;

    startTransition(async () => {
      try {
        const result = await onVoid(reason.trim());
        if (result.ok) {
          toast.success(successMessage);
          setOpen(false);
          setReason("");
        } else {
          setError(result.error);
          toast.error(result.error);
        }
      } finally {
        guard.end();
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setReason("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground">{description}</div>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="void_reason">İptal nedeni</Label>
            <Textarea
              id="void_reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Örn. Yanlış tutar girildi, doğrusu yeniden kaydedilecek."
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Vazgeç
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Kaydı iptal et
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
