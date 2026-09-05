"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Bir şeyler ters gitti",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-14 text-center">
      <span className="mb-4 grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </span>
      <p className="font-medium">{title}</p>
      {message && (
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{message}</p>
      )}
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RotateCcw />
          Tekrar dene
        </Button>
      )}
    </div>
  );
}
