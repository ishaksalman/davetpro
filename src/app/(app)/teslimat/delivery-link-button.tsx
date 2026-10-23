"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { setDeliveryLink } from "../rezervasyonlar/actions";

/**
 * Teslim bağlantısı: Drive / Pixieset / WeTransfer gibi dış galeri.
 * Kayıtlıysa rozet olarak görünür; tıklayınca düzenlenir ya da kaldırılır.
 */
export function DeliveryLinkButton({
  reservationId,
  value,
}: {
  reservationId: string;
  value: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [pending, startTransition] = useTransition();

  function save(next: string | null) {
    startTransition(async () => {
      const result = await setDeliveryLink(reservationId, next);
      if (result.ok) {
        toast.success(next ? "Teslim bağlantısı kaydedildi." : "Teslim bağlantısı kaldırıldı.");
        setOpen(false);
      } else toast.error(result.error);
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(value ?? "");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          className="h-7 gap-1.5 px-2 text-xs font-normal"
        >
          {pending ? <Loader2 className="animate-spin" /> : <Link2 />}
          {value ? "Galeri bağlantısı" : "Bağlantı ekle"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(20rem,calc(100vw-2rem))] space-y-3"
        align="start"
        collisionPadding={16}
      >
        <div className="space-y-1.5">
          <label htmlFor={`link-${reservationId}`} className="text-sm font-medium">
            Teslim bağlantısı
          </label>
          <Input
            id={`link-${reservationId}`}
            inputMode="url"
            placeholder="https://drive.google.com/…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Fotoğrafların durduğu Drive, Pixieset veya WeTransfer bağlantısı.
            Yalnızca https.
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          {value ? (
            <Button asChild variant="ghost" size="sm">
              <a href={value} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Aç
              </a>
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => save(null)}>
                Kaldır
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={pending || draft.trim() === "" || draft.trim() === value}
              onClick={() => save(draft)}
            >
              Kaydet
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
