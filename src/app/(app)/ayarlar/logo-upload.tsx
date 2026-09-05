"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toTurkishError } from "@/lib/errors";

/** Kabul edilen türler ve üst sınır depolama kovasındakiyle aynı olmalı. */
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/**
 * İşletme logosu yükleme.
 *
 * Dosya doğrudan tarayıcıdan Supabase Storage'a gidiyor; sunucu eylemine
 * taşımak dosyayı gereksiz yere bir kez daha aktarmak olurdu. Yol
 * logos/{business_id}/logo.{uzanti} — depolama politikası ilk klasör adının
 * kendi işletmesi olmasını şart koşuyor.
 *
 * Adres formun alanına yazılıyor; kalıcı olması için Kaydet'e basılması
 * gerekiyor. Yükleme tek başına işletme kaydını değiştirmiyor.
 */
export function LogoUpload({
  businessId,
  value,
  onChange,
  disabled,
}: {
  businessId: string;
  value: string;
  onChange: (url: string) => void;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(file: File) {
    if (!TYPES.includes(file.type)) {
      toast.error("Yalnızca PNG, JPG, WEBP veya SVG yükleyebilirsiniz.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Dosya 2 MB'tan büyük olamaz.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const path = `${businessId}/logo.${EXT[file.type]}`;
      const { error } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) {
        toast.error(toTurkishError(error));
        return;
      }

      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      // Aynı yola yazıldığı için tarayıcı eski görseli önbellekten gösterebilir;
      // sorgu parametresi bunu kırıyor.
      onChange(`${data.publicUrl}?v=${Date.now()}`);
      toast.success("Logo yüklendi. Kaydet'e basmayı unutmayın.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {value ? (
        <span className="flex h-16 w-32 items-center justify-center rounded-lg border bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="İşletme logosu"
            className="max-h-full max-w-full object-contain"
          />
        </span>
      ) : (
        <span className="flex h-16 w-32 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
          Logo yok
        </span>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void pick(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <ImageUp />}
          {value ? "Değiştir" : "Logo yükle"}
        </Button>

        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || busy}
            onClick={() => onChange("")}
          >
            <X />
            Kaldır
          </Button>
        )}
      </div>
    </div>
  );
}
