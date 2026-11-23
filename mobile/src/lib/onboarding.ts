import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BusinessType } from "@/lib/database.types";

/**
 * Tanıtım ekranlarının görüldüğü bilgisi cihazda tutulur (hassas değil → AsyncStorage).
 * Sürüm eki: tanıtım ciddi biçimde değişirse anahtarı artırıp herkese yeniden göstermek için.
 */
const SEEN_KEY = "onboarding.seen.v1";
const TYPE_KEY = "onboarding.businessType";

export async function markOnboardingSeen(): Promise<void> {
  try { await AsyncStorage.setItem(SEEN_KEY, "1"); } catch { /* depolama yoksa tanıtım bir sonraki açılışta tekrar görünür */ }
}

/** null = henüz okunuyor. */
export function useOnboardingSeen(): boolean | null {
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(SEEN_KEY).then((v) => alive && setSeen(v === "1"), () => alive && setSeen(false));
    return () => { alive = false; };
  }, []);
  return seen;
}

/**
 * Tanıtımda seçilen işletme tipi: işletme kurulumu (`/kurulum`) formunu önden seçer;
 * kurulum bitince `clearPendingBusinessType` ile silinir.
 */
export async function savePendingBusinessType(type: BusinessType): Promise<void> {
  try { await AsyncStorage.setItem(TYPE_KEY, type); } catch { /* seçim kurulumda yeniden sorulur */ }
}
export async function readPendingBusinessType(): Promise<BusinessType | null> {
  try {
    const v = await AsyncStorage.getItem(TYPE_KEY);
    return v === "salon" || v === "fotografci" || v === "organizasyon" ? v : null;
  } catch { return null; }
}
export async function clearPendingBusinessType(): Promise<void> {
  try { await AsyncStorage.removeItem(TYPE_KEY); } catch { /* kalan değer zararsız: yalnızca ön seçim */ }
}
