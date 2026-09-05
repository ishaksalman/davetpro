/**
 * Yazdırma düzeni: kenar çubuğu, üst bar ve tema kabuğu olmadan yalnızca belge.
 * Böylece ekrandaki görünüm ile A4 çıktısı birebir aynı oluyor.
 */
export default function PrintLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-full bg-neutral-100 print:bg-white">{children}</div>;
}
