"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Tarayıcının yazdırma penceresi: oradan "PDF olarak kaydet" de seçilebiliyor. */
export function PrintButton() {
  return (
    <Button size="sm" variant="outline" onClick={() => window.print()}>
      <Printer />
      Yazdır / PDF
    </Button>
  );
}
