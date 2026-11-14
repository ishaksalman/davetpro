import { sozlesmeDocx } from "@/lib/docx";
import { FOTOGRAF_ETIKETLERI, SOZLESME_SABLONU } from "@/lib/sozlesme-ornegi";

export const dynamic = "force-static";

/** /fotografci-sozlesme-ornegi/word — düzenlenebilir Word dosyası. */
export function GET() {
  return new Response(sozlesmeDocx(SOZLESME_SABLONU.fotografci, FOTOGRAF_ETIKETLERI) as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="fotografci-sozlesmesi-ornegi.docx"',
      "X-Robots-Tag": "noindex",
    },
  });
}
