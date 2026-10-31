import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Paylaşım görselleri için Manrope (sitenin yazı tipi, OFL lisanslı).
 *
 * NEDEN GÖMÜLÜ: ImageResponse'un varsayılan fontu (Geist) "ı" harfini
 * içermiyor; yedek fonttan geldiği için "Fotoğrafçılar  için" gibi fazladan
 * boşluk çıkıyordu ve başlıklar ince görünüyordu. Latin ve latin-ext ayrı
 * dosyalar: Türkçe harfler (ğ ş ı İ) latin-ext'te.
 *
 * Görseller derlemede statik üretiliyor; dosya okuma çalışma anında değil.
 */
export async function ogFontlari() {
  const kok = path.join(process.cwd(), "src", "assets", "fonts");
  const [latin, ext] = await Promise.all([
    readFile(path.join(kok, "manrope-latin-700-normal.woff")),
    readFile(path.join(kok, "manrope-latin-ext-700-normal.woff")),
  ]);
  return [
    { name: "Manrope", data: latin, weight: 700 as const, style: "normal" as const },
    { name: "Manrope", data: ext, weight: 700 as const, style: "normal" as const },
  ];
}
