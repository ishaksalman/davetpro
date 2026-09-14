"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, SubmitButton } from "@/components/auth/form-parts";
import { BUSINESS_TYPES, VERTICALS } from "@/lib/vertical";
import type { BusinessType } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { setupBusinessAction, type AuthState } from "../(auth)/actions";

export function SetupForm({
  defaultBusinessName,
  defaultFullName,
}: {
  defaultBusinessName: string;
  defaultFullName: string;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    setupBusinessAction,
    {},
  );

  /*
   * İşin cinsi sonradan DEĞİŞTİRİLEMİYOR: gider kategorileri, sözleşme
   * şablonu ve kaynakların adı buna göre kuruluyor. Seçimi burada, kurulum
   * anında alıyoruz — kayıt formunda sormak akışı uzatıyordu.
   */
  const [tip, setTip] = useState<BusinessType>("salon");

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <FormError message={state.error} />

      <input type="hidden" name="businessType" value={tip} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Ne iş yapıyorsunuz?</legend>
        <div className="grid gap-2">
          {BUSINESS_TYPES.map((key) => {
            const v = VERTICALS[key];
            const secili = tip === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={secili}
                onClick={() => setTip(key)}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left transition-colors",
                  secili
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/40 hover:bg-muted/50",
                )}
              >
                <span className="block text-sm font-medium">{v.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {v.description}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Bu seçim sonradan değiştirilemez.
        </p>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="businessName">İşletme adı</Label>
        <Input
          id="businessName"
          name="businessName"
          defaultValue={defaultBusinessName}
          placeholder={VERTICALS[tip].businessPlaceholder}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Ad soyad</Label>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={defaultFullName}
          placeholder="Ayşe Yılmaz"
          required
        />
      </div>

      <SubmitButton>Kurulumu tamamla</SubmitButton>
    </form>
  );
}
