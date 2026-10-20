"use client";

import { useState } from "react";
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
 * Ayarlar'daki işletme formu, panelden açılan pencerede. Başlangıç rehberi
 * kullanıcıyı Ayarlar'a göndermesin diye; form aynı, kayıt aynı yere gidiyor.
 */
export function BusinessDialog({
  business,
  primary,
}: {
  business: Business;
  /** Rehberde sıradaki adımsa birincil ve yazılı düğme. */
  primary?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={primary ? "default" : "outline"}>
          <Building2 />
          <span className={primary ? undefined : "hidden sm:inline"}>Bilgileri gir</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>İşletme bilgileri</DialogTitle>
          <DialogDescription>
            Sözleşme ve tekliflerin başlığında görünür.
          </DialogDescription>
        </DialogHeader>
        <BusinessForm business={business} disabled={false} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
