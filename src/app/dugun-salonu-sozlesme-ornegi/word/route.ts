import { sozlesmeDocx } from "@/lib/docx";
import { SOZLESME_SABLONU } from "@/lib/sozlesme-ornegi";

export const dynamic = "force-static";

/** /dugun-salonu-sozlesme-ornegi/word — düzenlenebilir Word dosyası. */
export function GET() {
  return new Response(sozlesmeDocx(SOZLESME_SABLONU.salon) as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="dugun-salonu-sozlesmesi-ornegi.docx"',
      // Dosya ayrı bir sonuç olarak dizine girmesin; sıralama sayfada toplansın.
      "X-Robots-Tag": "noindex",
    },
  });
}
