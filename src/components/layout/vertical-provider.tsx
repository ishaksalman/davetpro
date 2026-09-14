"use client";

import { createContext, useContext } from "react";
import { VERTICALS, type Vertical } from "@/lib/vertical";

/**
 * İşin cinsine göre etiketler — istemci bileşenleri için.
 *
 * Sunucu bileşenleri sözlüğü doğrudan `vertical(business.business_type)` ile
 * okuyor; istemci tarafında oturum yok, o yüzden değer düzenden aşağı bağlam
 * üzerinden iniyor. Prop olarak geçirmek onlarca bileşeni zincirlemek
 * demekti.
 */
const VerticalContext = createContext<Vertical>(VERTICALS.salon);

export function VerticalProvider({
  value,
  children,
}: {
  value: Vertical;
  children: React.ReactNode;
}) {
  return (
    <VerticalContext.Provider value={value}>{children}</VerticalContext.Provider>
  );
}

/** Sağlayıcı yoksa salon sözlüğüne düşüyor: mevcut davranış bozulmuyor. */
export function useVertical(): Vertical {
  return useContext(VerticalContext);
}
