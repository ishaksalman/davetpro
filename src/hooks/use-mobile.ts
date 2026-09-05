import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Ekran genişliğine göre mobil olup olmadığını bildirir.
 * useSyncExternalStore, effect içinde setState çağırmadan aboneliği yönetir.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

// Sunucuda pencere yok; masaüstü varsayılır, istemcide anında düzeltilir.
function getServerSnapshot() {
  return false;
}
