"use client";

import { useState, useTransition } from "react";
import { Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { CONTRACT_VARIABLES } from "@/lib/contracts";
import { contractTemplateSchema } from "@/lib/schemas";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { saveContractTemplate } from "./actions";

/**
 * Sözleşme şablonu düzenleyici.
 *
 * Şablon değişiklikleri yalnızca BUNDAN SONRA oluşturulacak sözleşmeleri
 * etkiler; oluşturulmuş sözleşmeler metinlerini dondurulmuş taşır.
 */
export function ContractTemplateForm({
  body: initialBody,
  disabled,
}: {
  body: string;
  disabled: boolean;
}) {
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const guard = useSubmitGuard();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guard.begin()) return;

    const parsed = contractTemplateSchema.safeParse({ body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Metin geçersiz.");
      guard.end();
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const result = await saveContractTemplate({ body });
        if (result.ok) toast.success("Sözleşme şablonu kaydedildi.");
        else toast.error(result.error);
      } finally {
        guard.end();
      }
    });
  }

  /** Değişkeni imlecin bulunduğu yere değil, metnin sonuna eklemek yerine
      kopyalamak daha öngörülebilir: kullanıcı istediği yere yapıştırır. */
  async function copyVariable(key: string) {
    const token = `{{${key}}}`;
    try {
      await navigator.clipboard.writeText(token);
      toast.success(`${token} kopyalandı.`);
    } catch {
      toast.error("Kopyalanamadı. Değişkeni elle yazabilirsiniz.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="contract-body">Sözleşme metni</FieldLabel>
          <Textarea
            id="contract-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={disabled}
            spellCheck={false}
            rows={26}
            className="font-mono text-xs leading-relaxed"
          />
          <p className="text-xs text-muted-foreground">
            <code>#</code> ile başlayan satır ana başlık, <code>##</code> ile
            başlayan satır bölüm başlığı olarak basılır. Boş satır paragrafları
            ayırır.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </Field>

        {!disabled && (
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Kaydet
            </Button>
            {body !== initialBody && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setBody(initialBody);
                  setError(null);
                }}
              >
                Değişiklikleri geri al
              </Button>
            )}
          </div>
        )}
      </form>

      <aside className="space-y-4">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
            <span>
              Buradaki metin genel bir taslaktır ve hukuki danışmanlık yerine
              geçmez. Yürürlüğe koymadan önce kendi hukuk danışmanınıza
              inceletmenizi öneririz.
            </span>
          </p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Kullanılabilir değişkenler</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Sözleşme oluşturulurken bu alanlar rezervasyon verisiyle doldurulur.
            Tıklayınca kopyalanır.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CONTRACT_VARIABLES.map((variable) => (
              <button
                key={variable.key}
                type="button"
                title={variable.label}
                onClick={() => void copyVariable(variable.key)}
                className="rounded-md border bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
              >
                {`{{${variable.key}}}`}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Şablonda yaptığınız değişiklikler yalnızca bundan sonra oluşturulacak
          sözleşmelere yansır; hazırlanmış sözleşmeler olduğu gibi kalır.
        </p>
      </aside>
    </div>
  );
}
