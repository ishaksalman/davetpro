"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  FormDialog,
  FormField,
  type TriggerButton,
} from "@/components/shared/form-dialog";
import { VENUE_COLORS } from "@/lib/constants";
import { teamSchema, type TeamInput } from "@/lib/schemas";
import type { Team } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { saveTeam } from "./actions";

export function TeamFormDialog({
  team,
  trigger,
  triggerButton,
  suggestedColor,
}: {
  team?: Team;
  trigger?: React.ReactElement;
  triggerButton?: TriggerButton;
  suggestedColor?: string;
}) {
  const defaultValues: TeamInput = {
    id: team?.id,
    name: team?.name ?? "",
    members: team?.members ?? "",
    phone: team?.phone ?? "",
    note: team?.note ?? "",
    color: team?.color ?? suggestedColor ?? VENUE_COLORS[0],
    is_active: team?.is_active ?? true,
  };

  const form = useForm<TeamInput>({
    resolver: zodResolver(teamSchema) as never,
    defaultValues,
  });

  const color = form.watch("color");

  return (
    <FormDialog
      trigger={trigger}
      triggerButton={triggerButton}
      title={team ? "Ekip bilgilerini düzenle" : "Yeni ekip"}
      description="Ekip, çekimi yapan kişilerdir. Plato ile karıştırmayın: plato çekimin yapıldığı yer ve aynı saatte tek çekim alır."
      form={form}
      defaultValues={defaultValues}
      action={saveTeam}
      successMessage={team ? "Ekip güncellendi." : "Ekip eklendi."}
    >
      <FormField form={form} name="name" label="Ekip adı">
        <Input id="name" placeholder="1. Ekip" {...form.register("name")} />
      </FormField>

      <FormField
        form={form}
        name="members"
        label="Ekipte kimler var"
        description="Serbest metin. Sabit kadro olmak zorunda değil."
      >
        <Input
          id="members"
          placeholder="Ela (foto), Murat (video)"
          {...form.register("members")}
        />
      </FormField>

      <FormField form={form} name="phone" label="Telefon">
        <Input
          id="phone"
          inputMode="tel"
          placeholder="0555 000 00 00"
          {...form.register("phone")}
        />
      </FormField>

      <FormField
        form={form}
        name="color"
        label="Renk"
        description="Listelerde ekibi ayırt etmek için."
      >
        <div className="flex flex-wrap gap-2">
          {VENUE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => form.setValue("color", c, { shouldDirty: true })}
              aria-label={`Renk ${c}`}
              aria-pressed={color === c}
              className={cn(
                "size-7 rounded-full ring-offset-2 ring-offset-background transition",
                color === c ? "ring-2 ring-foreground" : "hover:scale-110",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </FormField>

      <FormField form={form} name="note" label="Not">
        <Textarea
          id="note"
          rows={3}
          placeholder="Ekipman, çalışma saatleri, özel durumlar…"
          {...form.register("note")}
        />
      </FormField>

      <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <span className="text-sm">
          <span className="font-medium">Aktif</span>
          <span className="block text-muted-foreground">
            Pasif ekipler yeni çekim formunda listelenmez.
          </span>
        </span>
        <Switch
          checked={form.watch("is_active")}
          onCheckedChange={(v) => form.setValue("is_active", v, { shouldDirty: true })}
        />
      </label>
    </FormDialog>
  );
}
