"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { businessSchema, type BusinessInput } from "@/lib/schemas";
import type { Business } from "@/lib/database.types";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { LogoUpload } from "./logo-upload";
import { saveBusiness } from "./actions";

export function BusinessForm({
  business,
  disabled,
}: {
  business: Business;
  disabled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const form = useForm<BusinessInput>({
    resolver: zodResolver(businessSchema) as never,
    defaultValues: {
      name: business.name,
      phone: business.phone ?? "",
      city: business.city ?? "",
      authorized_person: business.authorized_person ?? "",
      email: business.email ?? "",
      address: business.address ?? "",
      tax_office: business.tax_office ?? "",
      tax_number: business.tax_number ?? "",
      logo_url: business.logo_url ?? "",
    },
  });

  const guard = useSubmitGuard();

  const runSubmit = form.handleSubmit(
    (values) => {
      startTransition(async () => {
        try {
          const result = await saveBusiness(values as BusinessInput);
          if (result.ok) toast.success("İşletme bilgileri güncellendi.");
          else toast.error(result.error);
        } finally {
          guard.end();
        }
      });
    },
    () => guard.end(),
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guard.begin()) return;
    void runSubmit(event);
  }

  const errors = form.formState.errors;

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          className="sm:col-span-2"
          data-invalid={errors.name ? true : undefined}
        >
          <FieldLabel htmlFor="name">İşletme adı</FieldLabel>
          <Input id="name" disabled={disabled} {...form.register("name")} />
          {errors.name && <FieldError errors={[{ message: errors.name.message }]} />}
        </Field>

        <Field data-invalid={errors.authorized_person ? true : undefined}>
          <FieldLabel htmlFor="authorized_person">Yetkili kişi</FieldLabel>
          <Input
            id="authorized_person"
            placeholder="Sözleşmede imzalayan kişi"
            disabled={disabled}
            {...form.register("authorized_person")}
          />
          {errors.authorized_person && (
            <FieldError errors={[{ message: errors.authorized_person.message }]} />
          )}
        </Field>

        <Field data-invalid={errors.phone ? true : undefined}>
          <FieldLabel htmlFor="phone">Telefon</FieldLabel>
          <Input
            id="phone"
            type="tel"
            placeholder="0212 000 00 00"
            disabled={disabled}
            {...form.register("phone")}
          />
          {errors.phone && <FieldError errors={[{ message: errors.phone.message }]} />}
        </Field>

        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="email">E-posta</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="iletisim@isletme.com"
            disabled={disabled}
            {...form.register("email")}
          />
          {errors.email && <FieldError errors={[{ message: errors.email.message }]} />}
        </Field>

        <Field data-invalid={errors.city ? true : undefined}>
          <FieldLabel htmlFor="city">Şehir</FieldLabel>
          <Input
            id="city"
            placeholder="İstanbul"
            disabled={disabled}
            {...form.register("city")}
          />
          {errors.city && <FieldError errors={[{ message: errors.city.message }]} />}
        </Field>

        <Field
          className="sm:col-span-2"
          data-invalid={errors.address ? true : undefined}
        >
          <FieldLabel htmlFor="address">Adres</FieldLabel>
          <Textarea
            id="address"
            rows={2}
            placeholder="Mahalle, cadde, no"
            disabled={disabled}
            {...form.register("address")}
          />
          {errors.address && (
            <FieldError errors={[{ message: errors.address.message }]} />
          )}
        </Field>

        <Field data-invalid={errors.tax_office ? true : undefined}>
          <FieldLabel htmlFor="tax_office">Vergi dairesi</FieldLabel>
          <Input
            id="tax_office"
            disabled={disabled}
            {...form.register("tax_office")}
          />
          {errors.tax_office && (
            <FieldError errors={[{ message: errors.tax_office.message }]} />
          )}
        </Field>

        <Field data-invalid={errors.tax_number ? true : undefined}>
          <FieldLabel htmlFor="tax_number">Vergi / TCKN no</FieldLabel>
          <Input
            id="tax_number"
            inputMode="numeric"
            disabled={disabled}
            {...form.register("tax_number")}
          />
          {errors.tax_number && (
            <FieldError errors={[{ message: errors.tax_number.message }]} />
          )}
        </Field>

        <Field
          className="sm:col-span-2"
          data-invalid={errors.logo_url ? true : undefined}
        >
          <FieldLabel htmlFor="logo_url">İşletme logosu</FieldLabel>
          <LogoUpload
            businessId={business.id}
            value={form.watch("logo_url") ?? ""}
            onChange={(url) =>
              form.setValue("logo_url", url, { shouldDirty: true })
            }
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Sözleşme ve teklif çıktılarının başlığında kullanılır. PNG, JPG,
            WEBP veya SVG · en fazla 2 MB. Şeffaf zeminli, yatay bir logo en iyi
            sonucu verir; yüklemezseniz işletme adı yazılır.
          </p>
          {errors.logo_url && (
            <FieldError errors={[{ message: errors.logo_url.message }]} />
          )}
        </Field>
      </div>

      <p className="text-xs text-muted-foreground">
        Yetkili kişi, adres ve vergi bilgileri sözleşme çıktısında kullanılır.
      </p>

      {!disabled && (
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Kaydet
        </Button>
      )}
    </form>
  );
}
