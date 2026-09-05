"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { initials } from "@/lib/format";
import type { Profile, UserRole } from "@/lib/database.types";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { inviteTeamMember, updateTeamMember, type InviteInput } from "./actions";

export function TeamManager({
  members,
  currentUserId,
  canManage,
}: {
  members: Profile[];
  currentUserId: string;
  canManage: boolean;
}) {
  return (
    <div className="max-w-2xl space-y-4">
      {canManage && <InviteDialog />}

      <ul className="divide-y rounded-xl border bg-card">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isSelf={member.id === currentUserId}
            canManage={canManage}
          />
        ))}
      </ul>
    </div>
  );
}

function MemberRow({
  member,
  isSelf,
  canManage,
}: {
  member: Profile;
  isSelf: boolean;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();

  // İşletme sahibinin rolü ve kendi kaydı değiştirilemez (veritabanı da engeller).
  const locked = !canManage || isSelf || member.role === "owner";

  function update(values: Partial<Pick<Profile, "role" | "can_view_finance" | "is_active">>) {
    startTransition(async () => {
      const result = await updateTeamMember(member.id, {
        role: values.role ?? member.role,
        can_view_finance: values.can_view_finance ?? member.can_view_finance,
        is_active: values.is_active ?? member.is_active,
      });
      if (result.ok) toast.success("Kullanıcı güncellendi.");
      else toast.error(result.error);
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-medium text-primary">
        {initials(member.full_name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {member.full_name}
          {isSelf && <span className="text-muted-foreground"> (siz)</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          {USER_ROLE_LABELS[member.role]}
          {!member.is_active && " · Pasif"}
        </p>
      </div>

      {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}

      {!locked && (
        <>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Finans
            <Switch
              checked={member.can_view_finance}
              disabled={pending || member.role === "manager"}
              onCheckedChange={(v) => update({ can_view_finance: v })}
              aria-label="Finansal verileri görebilir"
            />
          </label>

          <Select
            value={member.role}
            disabled={pending}
            onValueChange={(v) => update({ role: v as UserRole })}
          >
            <SelectTrigger className="w-32" aria-label="Rol">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manager">Yönetici</SelectItem>
              <SelectItem value="staff">Personel</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => update({ is_active: !member.is_active })}
          >
            {member.is_active ? "Pasife al" : "Aktifleştir"}
          </Button>
        </>
      )}
    </li>
  );
}

function InviteDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<InviteInput>({
    defaultValues: { email: "", full_name: "", role: "staff", can_view_finance: false },
  });

  const guard = useSubmitGuard();

  const runSubmit = form.handleSubmit(
    (values) => {
      setError(null);
      startTransition(async () => {
        try {
          const result = await inviteTeamMember(values);
          if (result.ok) {
            toast.success("Davet e-postası gönderildi.");
            setOpen(false);
            form.reset();
          } else {
            setError(result.error);
          }
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus />
          Personel davet et
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Personel davet et</DialogTitle>
          <DialogDescription>
            Davet edilen kişiye şifre belirlemesi için bir e-posta gönderilir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <Field>
            <FieldLabel htmlFor="invite_name">Ad soyad</FieldLabel>
            <Input id="invite_name" required {...form.register("full_name")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="invite_email">E-posta</FieldLabel>
            <Input id="invite_email" type="email" required {...form.register("email")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="invite_role">Rol</FieldLabel>
            <Select
              value={form.watch("role")}
              onValueChange={(v) => form.setValue("role", v as "manager" | "staff")}
            >
              <SelectTrigger id="invite_role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Yönetici — her şeyi görür</SelectItem>
                <SelectItem value="staff">Personel — sınırlı erişim</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {form.watch("role") === "staff" && (
            <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <span className="text-sm">
                <span className="font-medium">Finansal verileri görebilsin</span>
                <span className="block text-muted-foreground">
                  Kapalıyken tahsilat, gider ve raporlara erişemez.
                </span>
              </span>
              <Switch
                checked={form.watch("can_view_finance")}
                onCheckedChange={(v) => form.setValue("can_view_finance", v)}
              />
            </label>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Daveti gönder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
