"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Business } from "@/lib/database.types";
import { BusinessForm } from "../ayarlar/business-form";

/**
 * Ayarlar'daki işletme formu, pencerede. Başlangıç rehberi ve sözleşme
 * uyarısı kullanıcıyı Ayarlar'a göndermesin diye; form aynı, kayıt aynı yere
 * gidiyor.
 */
export function BusinessDialog({
  business,
  primary,
  label = "Bilgileri gir",
  alwaysShowLabel,
}: {
  business: Business;
  /** Rehberde sıradaki adımsa birincil ve yazılı düğme. */
  primary?: boolean;
  label?: string;
  /** Dar ekranda da yazı görünsün (rehberde ikincil adımlar yalnızca simge). */
  alwaysShowLabel?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={primary ? "default" : "outline"}>
          <Building2 />
          <span className={primary || alwaysShowLabel ? undefined : "hidden sm:inline"}>
            {label}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>İşletme bilgileri</DialogTitle>
          <DialogDescription>
            Sözleşme ve tekliflerin başlığında görünür.
          </DialogDescription>
        </DialogHeader>
        <BusinessForm
          business={business}
          disabled={false}
          onSaved={() => {
            setOpen(false);
            // Kayıt /ayarlar ve /panel'i tazeliyor; açıldığı sayfa (ör.
            // sözleşme önizlemesi) da yeni bilgilerle çizilsin.
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
