import { createContext, useContext, useEffect, useId, useRef, type ComponentRef, type ReactNode } from "react";
import { ScrollView, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps, View } from "react-native";

/**
 * Form kaydırma denetleyicisi: doğrulama hatası ya da sunucu hatası çıkınca, hatalı alanın / hata bandının
 * görünür olması için kaydırır. Kaydırma konumunu bilir; hatalı alanlar (`FieldShell`) ve hata bantları
 * (`Banner reveal`) kendilerini kaydeder, en üsttekine kaydırılır. Hiç kayıtlı yoksa en üste çıkılır.
 */
/** Konum ölçmek için yeterli en küçük arayüz (View ve ScrollView örnekleri bunu sağlar). */
type Measurable = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };
type Scrollable = Measurable & { scrollTo: (o: { x?: number; y?: number; animated?: boolean }) => void };

export type ScrollController = {
  setRef: (r: Scrollable | null) => void;
  setOffset: (y: number) => void;
  registerError: (id: string, view: Measurable | null) => void;
  /** Kayıtlı hatalı öğelerin en üsttekine kaydırır (kısa gecikmeyle: hata durumu çizildikten sonra). */
  revealFirstError: () => void;
  /** En üste kaydırır (üstteki uyarı/hata bandını göstermek için). */
  scrollToTop: () => void;
};

export function createScrollController(): ScrollController {
  let scroll: Scrollable | null = null;
  let offset = 0;
  const errors = new Map<string, Measurable>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const run = () => {
    const sv = scroll;
    if (!sv) return;
    const views = [...errors.values()];
    if (views.length === 0) { sv.scrollTo({ y: 0, animated: true }); return; }
    sv.measureInWindow((_x, top) => {
      let pending = views.length, best = Infinity;
      for (const v of views) {
        v.measureInWindow((_vx, vy) => {
          best = Math.min(best, vy);
          if (--pending === 0 && Number.isFinite(best)) sv.scrollTo({ y: Math.max(0, offset + (best - top) - 24), animated: true });
        });
      }
    });
  };

  return {
    setRef: (r) => { scroll = r; },
    setOffset: (y) => { offset = y; },
    registerError: (id, view) => { if (view) errors.set(id, view); else errors.delete(id); },
    revealFirstError: () => { if (timer) clearTimeout(timer); timer = setTimeout(run, 90); },
    scrollToTop: () => { scroll?.scrollTo({ y: 0, animated: true }); },
  };
}

export const FormScrollContext = createContext<ScrollController | null>(null);
export const useScrollController = () => useContext(FormScrollContext);

/** Hatalı olduğu sürece kendini denetleyiciye kaydeden görünüm; `view` ref'ini döndürür. */
export function useErrorAnchor(active: boolean, revealOnShow = false) {
  const ctl = useScrollController();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const id = useId();
  useEffect(() => {
    if (!ctl) return;
    ctl.registerError(id, active ? (ref.current as unknown as Measurable | null) : null);
    if (active && revealOnShow) ctl.revealFirstError();
    return () => ctl.registerError(id, null);
  }, [ctl, id, active, revealOnShow]);
  return ref;
}

/** Form ekranlarının kaydırılabilir alanı: denetleyiciyi alt öğelere dağıtır ve kaydırma konumunu izler. */
export function FormScrollView({ controller, children, onScroll, ...rest }: ScrollViewProps & { controller?: ScrollController; children: ReactNode }) {
  const own = useRef<ScrollController | null>(null);
  if (!own.current) own.current = createScrollController();
  const c = controller ?? own.current;
  return (
    <FormScrollContext.Provider value={c}>
      <ScrollView
        {...rest}
        ref={(r) => c.setRef(r as unknown as Scrollable | null)}
        scrollEventThrottle={16}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => { c.setOffset(e.nativeEvent.contentOffset.y); onScroll?.(e); }}
      >
        {children}
      </ScrollView>
    </FormScrollContext.Provider>
  );
}
