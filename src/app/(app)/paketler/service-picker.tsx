"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Düğün salonlarında en sık geçen hizmetler. Tek tıkla eklenir; listede
 * olmayan bir hizmet alttaki kutudan yazılıp eklenebilir.
 */
const SUGGESTIONS = [
  "Yemek",
  "İçecek",
  "Pasta",
  "DJ",
  "Fotoğraf",
  "Video çekimi",
  "Servis personeli",
];

const MAX_SERVICES = 30;

export function ServicePicker({
  value,
  onChange,
}: {
  value: string[];
  /**
   * Güncelleyici fonksiyon alır (setState gibi). Doğrudan dizi almıyoruz:
   * aynı render turunda iki rozete tıklanırsa ikinci tıklama bayat listeyi
   * temel alır ve ilk seçim kaybolurdu.
   */
  onChange: (update: (current: string[]) => string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  // Kullanıcının kendi eklediği hizmetler önerilerin ardına eklenir.
  const extras = value.filter((v) => !SUGGESTIONS.includes(v));
  const options = [...SUGGESTIONS, ...extras];
  const full = value.length >= MAX_SERVICES;

  function toggle(service: string) {
    onChange((current) =>
      current.includes(service)
        ? current.filter((v) => v !== service)
        : current.length >= MAX_SERVICES
          ? current
          : [...current, service],
    );
  }

  function addDraft() {
    const name = draft.trim();
    setDraft("");
    if (!name) return;
    onChange((current) =>
      current.includes(name) || current.length >= MAX_SERVICES
        ? current
        : [...current, name],
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {options.map((service) => {
          const selected = value.includes(service);
          return (
            <button
              key={service}
              type="button"
              onClick={() => toggle(service)}
              aria-pressed={selected}
              disabled={!selected && full}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                selected
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                !selected && full && "cursor-not-allowed opacity-40",
              )}
            >
              {selected && <Check className="size-3.5" />}
              {service}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          // Dialog içindeyiz: Enter formu göndermemeli, hizmeti eklemeli.
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
          placeholder="Listede yoksa yazıp ekleyin"
          maxLength={120}
          disabled={full}
          aria-label="Yeni hizmet"
          className="h-10"
        />
        <button
          type="button"
          onClick={addDraft}
          disabled={draft.trim().length === 0 || full}
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <Plus className="size-3.5" />
          Ekle
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {value.length === 0
          ? "Hizmet seçmek zorunlu değil."
          : `${value.length} hizmet seçildi${full ? " (üst sınır)" : ""}.`}
      </p>
    </div>
  );
}
