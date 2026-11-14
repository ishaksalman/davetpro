// Göreli + uzantılı: tests/seo.test.mts bu dosyayı Node ile doğrudan çalıştırıyor.
import { sablonuAyristir } from "./sozlesme-ornegi.ts";

/**
 * Sözleşme örneğini Word (.docx) dosyası olarak üretir.
 *
 * NEDEN: "sözleşme örneği" arayan kişi çoğunlukla düzenleyebileceği bir dosya
 * istiyor (Search Console'da "… pdf", "… örneği" sorguları). Sayfa 6. sırada
 * çıkıyordu ama sonuçta "Word" görmeyen kişi indirilebilir dosya sunan rakibe
 * tıklıyordu. Yazdır / PDF zaten vardı; eksik olan düzenlenebilir dosyaydı.
 *
 * NEDEN BAĞIMLILIKSIZ: .docx, üç XML dosyası içeren bir ZIP'ten ibaret.
 * Sıkıştırmasız (STORE) ZIP yazmak 40 satır; bunun için paket eklemeye
 * değmez. Metin şablondan geldiği için ürünle birebir aynı kalıyor.
 */

const xmlKacir = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Kosu = { metin: string; kalin?: boolean; vurgu?: boolean; boyut?: number };

function paragraf(kosular: Kosu[], o: { ortala?: boolean; sonra?: number; once?: number } = {}) {
  const pPr =
    `<w:pPr>${o.ortala ? '<w:jc w:val="center"/>' : ""}` +
    `<w:spacing w:before="${o.once ?? 0}" w:after="${o.sonra ?? 120}"/></w:pPr>`;
  const r = kosular
    .map((k) => {
      const rPr =
        `<w:rPr>${k.kalin ? "<w:b/>" : ""}${k.vurgu ? '<w:highlight w:val="yellow"/>' : ""}` +
        `${k.boyut ? `<w:sz w:val="${k.boyut}"/><w:szCs w:val="${k.boyut}"/>` : ""}</w:rPr>`;
      return `<w:r>${rPr}<w:t xml:space="preserve">${xmlKacir(k.metin)}</w:t></w:r>`;
    })
    .join("");
  return `<w:p>${pPr}${r}</w:p>`;
}

export function sozlesmeBelgesi(sablon: string, etiketler?: Record<string, string>): string {
  const belge = sablonuAyristir(sablon, etiketler);
  const govde: string[] = [
    paragraf([{ metin: belge.baslik, kalin: true, boyut: 28 }], { ortala: true, sonra: 360 }),
  ];
  for (const m of belge.maddeler) {
    govde.push(paragraf([{ metin: m.baslik, kalin: true }], { once: 200, sonra: 80 }));
    govde.push(
      paragraf(
        m.paragraf.map((p) =>
          p.tur === "metin" ? { metin: p.metin } : { metin: `[${p.etiket}]`, vurgu: true },
        ),
      ),
    );
  }
  govde.push(
    paragraf(
      [{ metin: "İŞLETME / HİZMET SAĞLAYICI\t\t\t\tMÜŞTERİ", kalin: true }],
      { once: 720, sonra: 600 },
    ),
    paragraf([{ metin: "İmza:\t\t\t\t\t\tİmza:" }]),
    paragraf(
      [
        {
          metin:
            "Bu metin genel bir örnektir, hukuki danışmanlık yerine geçmez. Sarı işaretli alanları doldurun; iptal ve iade maddelerini kendi koşullarınıza göre yazın. Bilgilerle dolu hâlini her rezervasyon için otomatik hazırlamak için: davetpro.com",
          boyut: 16,
        },
      ],
      { once: 600 },
    ),
  );

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${govde.join("")}` +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>' +
    "</w:sectPr></w:body></w:document>"
  );
}

const STILLER =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>' +
  '<w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="tr-TR"/></w:rPr></w:rPrDefault>' +
  '<w:pPrDefault><w:pPr><w:spacing w:line="276" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr></w:pPrDefault>' +
  "</w:docDefaults></w:styles>";

const ICERIK_TURLERI =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
  "</Types>";

const KOK_ILISKI =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  "</Relationships>";

const BELGE_ILISKI =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  "</Relationships>";

/** Şablondan indirilebilir .docx baytları. */
export function sozlesmeDocx(sablon: string, etiketler?: Record<string, string>): Uint8Array {
  return zipStore([
    ["[Content_Types].xml", ICERIK_TURLERI],
    ["_rels/.rels", KOK_ILISKI],
    ["word/_rels/document.xml.rels", BELGE_ILISKI],
    ["word/styles.xml", STILLER],
    ["word/document.xml", sozlesmeBelgesi(sablon, etiketler)],
  ]);
}

/* ------------------------------------------------------------------------- */
/* Sıkıştırmasız ZIP                                                          */
/* ------------------------------------------------------------------------- */

const CRC_TABLOSU = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLOSU[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zipStore(dosyalar: [string, string][]): Uint8Array {
  const enc = new TextEncoder();
  const yerel: Uint8Array[] = [];
  const merkez: Uint8Array[] = [];
  let ofset = 0;

  for (const [ad, icerik] of dosyalar) {
    const adB = enc.encode(ad);
    const veri = enc.encode(icerik);
    const crc = crc32(veri);

    const b = new Uint8Array(30 + adB.length);
    const v = new DataView(b.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x0800, true); // UTF-8 dosya adı
    v.setUint16(8, 0, true); // STORE
    v.setUint32(14, crc, true);
    v.setUint32(18, veri.length, true);
    v.setUint32(22, veri.length, true);
    v.setUint16(26, adB.length, true);
    b.set(adB, 30);
    yerel.push(b, veri);

    const m = new Uint8Array(46 + adB.length);
    const mv = new DataView(m.buffer);
    mv.setUint32(0, 0x02014b50, true);
    mv.setUint16(4, 20, true);
    mv.setUint16(6, 20, true);
    mv.setUint16(8, 0x0800, true);
    mv.setUint16(10, 0, true);
    mv.setUint32(16, crc, true);
    mv.setUint32(20, veri.length, true);
    mv.setUint32(24, veri.length, true);
    mv.setUint16(28, adB.length, true);
    mv.setUint32(42, ofset, true);
    m.set(adB, 46);
    merkez.push(m);

    ofset += b.length + veri.length;
  }

  const merkezBoy = merkez.reduce((s, x) => s + x.length, 0);
  const son = new Uint8Array(22);
  const sv = new DataView(son.buffer);
  sv.setUint32(0, 0x06054b50, true);
  sv.setUint16(8, dosyalar.length, true);
  sv.setUint16(10, dosyalar.length, true);
  sv.setUint32(12, merkezBoy, true);
  sv.setUint32(16, ofset, true);

  const parcalar = [...yerel, ...merkez, son];
  const out = new Uint8Array(parcalar.reduce((s, x) => s + x.length, 0));
  let i = 0;
  for (const p of parcalar) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}
