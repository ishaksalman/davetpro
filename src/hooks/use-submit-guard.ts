import { useRef } from "react";

/**
 * Aynı gönderimin iki kez çalışmasını engeller.
 *
 * `useTransition`'ın `pending` bayrağı tek başına yetmiyor: react-hook-form'un
 * handleSubmit'i doğrulamayı `await` ettiği için, ikinci tıklama geldiğinde
 * `pending` henüz true olmuyor ve buton devre dışı kalmıyor. Ölçümde hem çift
 * tıklama hem arka arkaya iki Enter, eylemi iki kez çalıştırıyordu — tahsilat
 * ve giderde bu doğrudan çift kayıt demek.
 *
 * ref senkron güncellendiği için ikinci tetikleme aynı olay turunda yakalanır.
 */
export function useSubmitGuard() {
  const busy = useRef(false);

  return {
    /** Gönderim başlatılabilir mi? Başlatılabiliyorsa kilidi alır. */
    begin: () => {
      if (busy.current) return false;
      busy.current = true;
      return true;
    },
    /** Gönderim bitti (başarılı, hatalı ya da doğrulama başarısız). */
    end: () => {
      busy.current = false;
    },
  };
}
