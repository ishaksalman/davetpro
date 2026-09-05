"use client";

import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

export function FormNotice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-lg bg-success/10 px-3 py-2.5 text-sm text-success"
    >
      <MailCheck className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}
