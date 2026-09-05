"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const grouping = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

/**
 * Türk kullanımına uygun tutar girişi: yazarken binlik ayracı eklenir
 * (120.000), ondalık ayracı virgüldür (120.000,50).
 * Dışarıya her zaman sayı verir; hesaplama katmanı biçimlendirmeyle uğraşmaz.
 */
export function MoneyInput({
  value,
  onValueChange,
  className,
  id,
  placeholder = "0",
  disabled,
}: {
  value: number | string | null | undefined;
  onValueChange: (value: number) => void;
  className?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(() => toDisplay(value));
  const [lastValue, setLastValue] = useState(value);

  // Form dışarıdan sıfırlandığında (ör. pencere yeniden açıldığında) eşitle.
  // Render sırasında düzeltme, effect'e göre fazladan bir tur render önler.
  if (value !== lastValue) {
    setLastValue(value);
    if (parseTr(text) !== toNumber(value)) setText(toDisplay(value));
  }

  function handleChange(raw: string) {
    // Yalnızca rakam ve tek bir virgül kalsın.
    const cleaned = raw.replace(/[^\d,]/g, "").replace(/,(?=.*,)/g, "");
    const [intPart = "", decPart] = cleaned.split(",");
    const grouped = intPart === "" ? "" : grouping.format(Number(intPart));
    const next =
      decPart === undefined ? grouped : `${grouped},${decPart.slice(0, 2)}`;

    setText(next);
    onValueChange(parseTr(next));
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
        ₺
      </span>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.value)}
        className={cn("tabular pl-7", className)}
      />
    </div>
  );
}

function toNumber(value: number | string | null | undefined): number {
  if (value === undefined || value === null || value === "") return 0;
  return typeof value === "number" ? value : parseTr(value);
}

function toDisplay(value: number | string | null | undefined): string {
  const n = toNumber(value);
  if (n === 0) return "";
  return Number.isInteger(n)
    ? grouping.format(n)
    : `${grouping.format(Math.trunc(n))},${String(Math.round((n % 1) * 100)).padStart(2, "0")}`;
}

function parseTr(text: string): number {
  const normalized = text.replaceAll(".", "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}
