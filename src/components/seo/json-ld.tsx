/**
 * schema.org yapısal verisi. `<` kaçırılıyor: metinlerden biri "</script>"
 * içerse bile etiket kapanmasın (Next JSON-LD rehberindeki öneri).
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
