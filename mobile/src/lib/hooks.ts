import { useCallback, useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useFocusEffect } from "expo-router";

/**
 * Çift gönderim kilidi. `pending` bayrağı state olduğu için ikinci dokunuş
 * render'dan ÖNCE gelebilir; ref senkron kilitler. Finansal kayıtta bu çift
 * kayıt demektir (web `useSubmitGuard` ile aynı gerekçe).
 */
export function useSubmitGuard() {
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (lock.current) return undefined;
    lock.current = true;
    setPending(true);
    try {
      return await fn();
    } finally {
      lock.current = false;
      setPending(false);
    }
  }, []);
  return { run, pending };
}

/** Çevrimdışı bayrağı: çevrimdışıyken finansal kayıt eklenmez (çift kayıt riski). */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false));
    return unsub;
  }, []);
  return online;
}

/** Ekran odağa gelince (ilk açılış hariç) yeniler. */
export function useRefetchOnFocus(refetch: () => void) {
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) { first.current = false; return; }
      refetch();
    }, [refetch]),
  );
}

/**
 * Pull-to-refresh göstergesi yalnızca kullanıcı ekranı çektiğinde görünsün.
 * Arka plandaki otomatik yenilemeler (isRefetching) göstergeyi tetiklemez.
 */
export function usePullRefresh(refetch: () => unknown) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.resolve()
      .then(refetch)
      .catch(() => {})
      .finally(() => setTimeout(() => setRefreshing(false), 400));
  }, [refetch]);
  return { refreshing, onRefresh };
}

/** Sorgu iptal edildiğinde / ekran kapandığında setState uyarısı vermeyen debounce. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
