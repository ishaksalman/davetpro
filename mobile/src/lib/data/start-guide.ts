import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../supabase";
import { keys } from "./lookups";

/** Toplam rezervasyon sayısı (iptaller dahil, web rehberiyle aynı). `keys.reservations` altında: rezervasyon eklenince kendiliğinden yenilenir. */
export function useReservationCount(enabled: boolean) {
  return useQuery({
    queryKey: [...keys.reservations, "count"],
    enabled,
    queryFn: async () => {
      const r = await supabase.from("reservations").select("id", { count: "exact", head: true });
      if (r.error) throw new Error(r.error.message);
      return r.count ?? 0;
    },
  });
}

const HIDE_KEY = "davetpro.baslangic-rehberi-gizli";

/**
 * "Rehberi gizle" tercihi: yalnızca bu cihazda. Okunamazsa kart görünür kalır; gizleme bir kolaylıktır,
 * kaybolsa da rehber kendini tekrar gösterir, veri kaybı olmaz (web ile aynı gerekçe).
 * `hidden` okunana kadar null: kart yanıp sönmesin diye bekler.
 */
export function useGuideHidden(): { hidden: boolean | null; hide: () => void } {
  const [hidden, setHidden] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(HIDE_KEY).then((v) => setHidden(v === "1")).catch(() => setHidden(false));
  }, []);
  const hide = useCallback(() => {
    setHidden(true);
    AsyncStorage.setItem(HIDE_KEY, "1").catch(() => {});
  }, []);
  return { hidden, hide };
}
