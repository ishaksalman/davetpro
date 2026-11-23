import { useMemo } from "react";
import { useForm as useRHF, type FieldValues, type UseFormProps, type UseFormReturn } from "react-hook-form";
import { createScrollController, useScrollController, type ScrollController } from "~/ui/FormScroll";

/**
 * `react-hook-form` `useForm` + otomatik "hataya kaydır": doğrulama başarısız olunca ilk hatalı alana kaydırılır.
 * Form bir `BottomSheet` içindeyse sheet'in kaydırma alanı kullanılır; sayfa formunda dönen `scroll`
 * denetleyicisi `<FormScrollView controller={scroll}>`'e verilir.
 */
export function useForm<T extends FieldValues>(props: UseFormProps<T>): UseFormReturn<T> & { scroll: ScrollController } {
  const form = useRHF<T>(props);
  const inherited = useScrollController();
  const own = useMemo(() => createScrollController(), []);
  const scroll = inherited ?? own;
  const handleSubmit: UseFormReturn<T>["handleSubmit"] = (onValid, onInvalid) =>
    form.handleSubmit(onValid, (errors, event) => {
      onInvalid?.(errors, event);
      scroll.revealFirstError();
    });
  return { ...form, handleSubmit, scroll };
}
