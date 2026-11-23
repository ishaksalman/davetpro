import { useState } from "react";
import { View } from "react-native";
import { Controller } from "react-hook-form";
import { useForm } from "~/lib/use-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerInput } from "@/lib/schemas";
import { useSaveCustomer } from "~/lib/data/customers";
import { useSubmitGuard } from "~/lib/hooks";
import { Button } from "~/ui/Button";
import { Banner, useToast } from "~/ui/Feedback";
import { TextField } from "~/ui/Inputs";
import { BottomSheet } from "~/ui/Sheet";
import type { Customer } from "@/lib/database.types";

/**
 * Müşteri oluştur / düzenle. Şema web ile ortak: ad soyad, SÖZLEŞMEDE GEÇECEK AD
 * (çift adı taraf olamaz), telefon zorunlu; e-posta, adres, T.C. Kimlik (KVKK:
 * zorunlu değil, girilirse 11 hane) ve not opsiyonel.
 */
export function CustomerSheet({
  visible, onClose, customer, onSaved,
}: { visible: boolean; onClose: () => void; customer?: Customer | null; onSaved?: (id: string) => void }) {
  return (
    <BottomSheet visible={visible} title={customer ? "Müşteriyi düzenle" : "Yeni müşteri"} onClose={onClose}>
      <CustomerForm customer={customer ?? null} onSaved={(id) => { onSaved?.(id); onClose(); }} />
    </BottomSheet>
  );
}

function CustomerForm({ customer, onSaved }: { customer: Customer | null; onSaved: (id: string) => void }) {
  const toast = useToast();
  const guard = useSubmitGuard();
  const save = useSaveCustomer();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors } } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema) as never,
    defaultValues: {
      id: customer?.id,
      full_name: customer?.full_name ?? "",
      contract_name: customer?.contract_name ?? customer?.full_name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      address: customer?.address ?? "",
      national_id: customer?.national_id ?? "",
      notes: customer?.notes ?? "",
    },
  });

  const onSubmit = handleSubmit((values) =>
    guard.run(async () => {
      setFormError(null);
      const r = await save.mutateAsync(values);
      if (!r.ok) return setFormError(r.error);
      toast({ tone: "success", message: customer ? "Müşteri güncellendi" : "Müşteri eklendi" });
      onSaved(r.id);
    }),
  );

  const f = (name: keyof CustomerInput, label: string, extra: object = {}, helper?: string) => (
    <Controller control={control} name={name} render={({ field }) => (
      <TextField label={label} helper={helper} value={String(field.value ?? "")} onChangeText={field.onChange} error={errors[name]?.message as string | undefined} {...extra} />
    )} />
  );

  return (
    <View style={{ gap: 16 }}>
      {formError ? <Banner reveal tone="danger" title="Kaydedilemedi" body={formError} /> : null}
      {f("full_name", "Ad soyad (çift adı olabilir)", { autoCapitalize: "words", placeholder: "Ayşe & Mehmet" })}
      {f("contract_name", "Sözleşmede geçecek ad", { autoCapitalize: "words" }, "İmzalayacak tek kişinin adı.")}
      {f("phone", "Telefon", { keyboardType: "phone-pad", placeholder: "0532 111 22 33", autoComplete: "tel" })}
      {f("email", "E-posta (isteğe bağlı)", { keyboardType: "email-address", autoCapitalize: "none", autoCorrect: false })}
      {f("address", "Adres (isteğe bağlı)", { multiline: true })}
      {f("national_id", "T.C. Kimlik No (isteğe bağlı)", { keyboardType: "number-pad", maxLength: 11 }, "Yalnızca gerekliyse doldurun (KVKK).")}
      {f("notes", "Notlar (isteğe bağlı)", { multiline: true })}
      <Button label={customer ? "Değişiklikleri kaydet" : "Müşteriyi kaydet"} loading={guard.pending} onPress={() => { void onSubmit(); }} />
    </View>
  );
}
