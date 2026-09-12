"use client";

import {
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";
import {
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";
import { Loader2, Pencil, Plus } from "lucide-react";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

/**
 * Alan adı -> etiket eşlemesi.
 *
 * Doğrulama başarısız olduğunda düğmenin yanında hangi alanların eksik
 * olduğunu yazabilmek için gerekiyor: hata nesnesi yalnızca alan ADINI
 * biliyor, kullanıcıya "venue_id" demek anlamsız.
 */
const FieldLabels = createContext<Map<string, string> | null>(null);

/**
 * Doğrulama özetinin tutulduğu hata yolu. `root` altında: react-hook-form
 * root hatalarını alan hatası saymıyor, form.reset ile de temizleniyor.
 */
const VALIDATION_SUMMARY = "root.validationSummary" as never;

/**
 * Pencereyi açan butonun tarifi — JSX değil, düz veri.
 *
 * Sunucu bileşenlerinden Radix `asChild` (Slot) içine JSX element geçirmek
 * kırılgan: element RSC sınırından geçerken Slot'un beklediği "tek element"
 * biçimini kaybedebiliyor ve "failed to slot onto its children" hatası
 * veriyor. Butonu istemci tarafında kendimiz kurunca bu ihtimal ortadan
 * kalkıyor; sunucudan yalnızca serileştirilebilir veri geçiyor.
 */
export type TriggerButton = {
  label: string;
  icon?: "plus" | "pencil";
  variant?: "default" | "outline";
  size?: "default" | "sm";
  /** Dar ekranda yalnızca ikon görünsün (sayfa başlıklarında yer kazandırır). */
  labelHiddenOnMobile?: boolean;
};

const TRIGGER_ICONS = { plus: Plus, pencil: Pencil } as const;

/** TriggerButton tarifini gerçek butona çevirir. İstemci tarafında çalışır. */
export function renderTriggerButton(config: TriggerButton) {
  const Icon = config.icon ? TRIGGER_ICONS[config.icon] : null;
  return (
    <Button
      variant={config.variant ?? "default"}
      size={config.size ?? "default"}
    >
      {Icon && <Icon />}
      {config.labelHiddenOnMobile ? (
        <span className="hidden sm:inline">{config.label}</span>
      ) : (
        config.label
      )}
    </Button>
  );
}

/**
 * Tüm modüllerde ortak kullanılan form penceresi.
 * Açılışta formu sıfırlar, gönderim sırasında butonu kilitler, sonucu toast
 * ile bildirir. Sunucu eylemi revalidatePath çağırdığı için liste kendiliğinden
 * tazelenir.
 */
export function FormDialog<TValues extends FieldValues>({
  trigger,
  triggerButton,
  open: controlledOpen,
  onOpenChange,
  title,
  description,
  submitLabel = "Kaydet",
  form,
  defaultValues,
  action,
  successMessage,
  submitBlockedReason,
  children,
  contentClassName,
}: {
  /**
   * Tetikleyiciyi doğrudan element olarak vermek — YALNIZCA istemci
   * bileşenlerinden (ör. bir DropdownMenuItem). Sunucu bileşenlerinden
   * `triggerButton` kullanın.
   */
  trigger?: React.ReactElement;
  /** Sunucu bileşenlerinden güvenli tetikleyici tarifi. */
  triggerButton?: TriggerButton;
  /** Dışarıdan açılacaksa (ör. takvimde boş güne tıklama) kontrollü kullanım. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel?: string;
  form: UseFormReturn<TValues>;
  defaultValues: DefaultValues<TValues>;
  action: (values: TValues) => Promise<ActionResult>;
  successMessage: string;
  /**
   * Şemayla ifade edilemeyen, sunucudan gelen veriye bağlı engeller için
   * (ör. seçilen salon/saat dolu). Doluysa gönderim düğmesi kilitlenir ve
   * neden formun altında görünür.
   */
  submitBlockedReason?: string | null;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [pending, startTransition] = useTransition();
  const guard = useSubmitGuard();
  // Etiket haritası: ref DEĞİL, çünkü render sırasında (Provider değeri
  // olarak) okunuyor. Lazy useState kalıcı ve render'da okunması güvenli.
  const [fieldLabels] = useState(() => new Map<string, string>());

  // Pencere her açıldığında formu temiz bir başlangıç durumuna getir.
  // Kilit de burada açılır: yarıda kapatılan bir gönderim formu kilitlemesin.
  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
      guard.end();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const runSubmit = form.handleSubmit(
    (values) => {
      form.clearErrors(VALIDATION_SUMMARY);
      startTransition(async () => {
        try {
          const result = await action(values as TValues);
          if (result.ok) {
            toast.success(successMessage);
            setOpen(false);
          } else {
            // Sunucudan gelen hata (ör. çakışan rezervasyon) formun üstünde kalsın.
            form.setError("root", { message: result.error });
            toast.error(result.error);
          }
        } finally {
          guard.end();
        }
      });
    },
    // Doğrulama başarısızsa kilit açılmalı, yoksa form kalıcı kilitlenir.
    (errors) => {
      guard.end();

      const names = Object.keys(errors).filter((name) => name !== "root");
      const labels = names
        .map((name) => fieldLabels.get(name))
        .filter((label): label is string => Boolean(label));

      /*
       * Özet formun kendi hata durumunda tutuluyor, ayrı bir state'te değil:
       * pencere açılırken zaten form.reset(defaultValues) çalışıyor ve onu da
       * temizliyor. Ayrı state olsaydı aynı temizliği effect içinde yapmak
       * gerekirdi; effect içinde setState zincirleme render tetikliyor.
       */
      form.setError(VALIDATION_SUMMARY, {
        message:
          labels.length > 0
            ? `Eksik veya hatalı: ${labels.join(", ")}`
            : "Formda eksik veya hatalı alanlar var.",
      });

      // Özet düğmenin yanında duruyor ama asıl düzeltme alanın kendisinde;
      // ilk hatalı alanı görünür yapmazsak kullanıcı onu aramak zorunda.
      // Alan id'leri form alan adlarıyla aynı (FormField htmlFor={name}).
      const first = names[0];
      if (first) {
        document
          .getElementById(first)
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    },
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitBlockedReason) return;
    if (!guard.begin()) return;
    void runSubmit(event);
  }

  const rootError = form.formState.errors.root?.message;
  const invalidSummary = getErrorMessage(
    form.formState.errors,
    VALIDATION_SUMMARY,
  );

  // Slot tek bir element bekler; geçersiz bir tetikleyici çökme yerine
  // sessizce yok sayılır.
  const provided = triggerButton ? renderTriggerButton(triggerButton) : trigger;
  const triggerNode = isValidElement(provided) ? provided : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerNode && <DialogTrigger asChild>{triggerNode}</DialogTrigger>}
      <DialogContent
        className={cn(
          "max-h-[90svh] gap-0 overflow-y-auto sm:max-w-lg",
          contentClassName,
        )}
      >
        <DialogHeader className="pb-4">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <FieldLabels.Provider value={fieldLabels}>
            {rootError && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                {rootError}
              </p>
            )}

            {children}

            <DialogFooter className="flex-col items-stretch gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
              {/* Çakışma varsa gönderim zaten hiç doğrulanmıyor; ikisi aynı
                anda oluşamaz. Çakışma önce gelir. */}
              {(submitBlockedReason ?? invalidSummary) && (
                <p
                  role="alert"
                  className="mr-auto text-sm text-destructive sm:max-w-sm"
                >
                  {submitBlockedReason ?? invalidSummary}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Vazgeç
              </Button>
              <Button
                type="submit"
                disabled={pending || Boolean(submitBlockedReason)}
              >
                {pending && <Loader2 className="animate-spin" />}
                {submitLabel}
              </Button>
            </DialogFooter>
          </FieldLabels.Provider>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Etiket + hata mesajını tek yerde toplayan alan sarmalayıcısı. */
export function FormField<TValues extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  children,
}: {
  form: UseFormReturn<TValues>;
  name: Path<TValues>;
  label: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const error = getErrorMessage(form.formState.errors, name);

  // Etiketi üst forma bildir: doğrulama özeti alan adını değil bunu yazıyor.
  const labels = useContext(FieldLabels);
  useEffect(() => {
    if (!labels) return;
    labels.set(name, label);
    return () => {
      labels.delete(name);
    };
  }, [labels, name, label]);

  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      {children}
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && <FieldError errors={[{ message: error }]} />}
    </Field>
  );
}

function getErrorMessage(errors: unknown, name: string): string | undefined {
  const value = name
    .split(".")
    .reduce<unknown>(
      (acc, key) => (acc as Record<string, unknown> | undefined)?.[key],
      errors,
    );
  const message = (value as { message?: unknown } | undefined)?.message;
  return typeof message === "string" ? message : undefined;
}
