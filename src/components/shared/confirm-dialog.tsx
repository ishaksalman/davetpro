"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

/**
 * Geri alınamayan işlemler için onay penceresi.
 * Sunucu eylemi bir ActionResult döndürür; hata mesajı toast ile gösterilir.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Onayla",
  successMessage,
  destructive = true,
  onConfirm,
}: {
  /** AlertDialogTrigger asChild ile Slot'a verilir: tek element olmalı. */
  trigger: React.ReactElement;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  successMessage?: string;
  destructive?: boolean;
  onConfirm: () => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const guard = useSubmitGuard();

  function handleConfirm(event: React.MouseEvent) {
    event.preventDefault();
    if (!guard.begin()) return;
    startTransition(async () => {
      try {
        const result = await onConfirm();
        if (result.ok) {
          if (successMessage) toast.success(successMessage);
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
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground">{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className={cn(
              destructive &&
                "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30",
            )}
          >
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
