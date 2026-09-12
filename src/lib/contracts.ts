import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatMoney, formatNumber, formatTime } from "@/lib/format";
import type {
  Business,
  ContractSnapshot,
  Customer,
  Profile,
} from "@/lib/database.types";
import type { ReservationRow } from "@/lib/queries";

/**
 * Şablonda kullanılabilecek değişkenler. Ayarlar ekranında kullanıcıya bu
 * liste gösteriliyor; ileride ikinci bir şablon eklenirse aynı sözlük geçerli.
 */
export const CONTRACT_VARIABLES: { key: string; label: string }[] = [
  { key: "business_name", label: "İşletme adı" },
  { key: "business_authorized", label: "Yetkili kişi" },
  { key: "business_phone", label: "İşletme telefonu" },
  { key: "business_email", label: "İşletme e-postası" },
  { key: "business_address", label: "İşletme adresi" },
  { key: "business_tax_office", label: "Vergi dairesi" },
  { key: "business_tax_number", label: "Vergi numarası" },
  { key: "customer_name", label: "Müşteri adı" },
  { key: "customer_phone", label: "Müşteri telefonu" },
  { key: "customer_email", label: "Müşteri e-postası" },
  { key: "customer_address", label: "Müşteri adresi" },
  { key: "customer_national_id", label: "T.C. Kimlik No" },
  { key: "event_type", label: "Organizasyon türü" },
  { key: "event_date", label: "Organizasyon tarihi" },
  { key: "start_time", label: "Başlangıç saati" },
  { key: "end_time", label: "Bitiş saati" },
  { key: "venue_name", label: "Salon" },
  { key: "package_name", label: "Paket" },
  { key: "included_services", label: "Pakete dahil hizmetler" },
  { key: "extra_services", label: "Ek hizmetler (tutarlı liste)" },
  { key: "guest_count", label: "Kişi sayısı" },
  { key: "notes", label: "Rezervasyon notları" },
  { key: "total_price", label: "Toplam bedel" },
  { key: "discount_amount", label: "İndirim" },
  { key: "net_price", label: "Net sözleşme bedeli" },
  { key: "paid_amount", label: "Tahsil edilen" },
  { key: "remaining_amount", label: "Kalan bakiye" },
  { key: "due_date", label: "Kalan ödeme tarihi" },
  { key: "contract_number", label: "Sözleşme numarası" },
  { key: "contract_date", label: "Sözleşme tarihi" },
];

/**
 * Sözleşme anındaki verilerin dondurulmuş kopyası.
 *
 * Finansal değerler burada YENİDEN HESAPLANMIYOR — rezervasyonun mevcut
 * finans görünümünden (reservation_financials) olduğu gibi alınıyor. Sözleşme
 * oluşturmak hiçbir tahsilat/gelir kaydı üretmez.
 */
export function buildContractSnapshot({
  business,
  customer,
  reservation,
  profile,
  today,
}: {
  business: Business;
  customer: Customer;
  reservation: ReservationRow;
  profile: Profile;
  today: string;
}): ContractSnapshot {
  return {
    business: {
      name: business.name,
      authorized_person: business.authorized_person,
      phone: business.phone,
      email: business.email,
      address: business.address,
      city: business.city,
      tax_office: business.tax_office,
      tax_number: business.tax_number,
      logo_url: business.logo_url,
    },
    customer: {
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      national_id: customer.national_id,
    },
    organization: {
      type: reservation.organization_type,
      venue_name: reservation.venue?.name ?? "—",
      event_date: reservation.event_date,
      start_time: reservation.start_time,
      end_time: reservation.end_time,
      guest_count: reservation.guest_count,
      package_name: reservation.package?.name ?? null,
      included_services: reservation.package?.included_services ?? [],
      // Sözleşmede tutarıyla birlikte yazılıyor: pakete dahil olmayan
      // hizmetlerin bedeli tarafların üzerinde anlaştığı metinde görünmeli.
      extra_services: reservation.items.map((i) => ({
        name: i.name,
        amount: i.amount,
      })),
      notes: reservation.notes,
    },
    finance: {
      gross_amount: reservation.pricing?.gross_amount ?? 0,
      discount_amount: reservation.pricing?.discount_amount ?? 0,
      net_amount: reservation.net_amount,
      collected_amount: reservation.collected_amount,
      balance_amount: reservation.balance_amount,
      unit_price: reservation.unit_price,
      due_date: reservation.due_date,
    },
    meta: {
      contract_date: today,
      created_by_name: profile.full_name,
    },
  };
}

const EMPTY = "—";

/** Şablon değişkenlerinin snapshot'tan üretilen değerleri. */
export function contractVariableValues(
  snapshot: ContractSnapshot,
  contractNumber: string,
): Record<string, string> {
  const { business: b, customer: c, organization: o, finance: f, meta } = snapshot;

  return {
    business_name: b.name,
    business_authorized: b.authorized_person ?? EMPTY,
    business_phone: b.phone ?? EMPTY,
    business_email: b.email ?? EMPTY,
    business_address: [b.address, b.city].filter(Boolean).join(", ") || EMPTY,
    business_tax_office: b.tax_office ?? EMPTY,
    business_tax_number: b.tax_number ?? EMPTY,

    customer_name: c.full_name,
    customer_phone: c.phone,
    customer_email: c.email ?? EMPTY,
    customer_address: c.address ?? EMPTY,
    customer_national_id: c.national_id ?? EMPTY,

    event_type: ORGANIZATION_TYPE_LABELS[o.type],
    event_date: formatDate(o.event_date),
    start_time: formatTime(o.start_time),
    end_time: formatTime(o.end_time),
    venue_name: o.venue_name,
    package_name: o.package_name ?? "Paketsiz",
    included_services: o.included_services.length
      ? o.included_services.join(", ")
      : EMPTY,
    // ?? []: 0030 öncesinde kaydedilmiş sözleşmelerin anlık kopyasında bu
    // alan yok. Anlık kopya JSON olarak saklandığı için tip güvencesi
    // geçmiş kayıtlar için geçerli değil.
    extra_services: (o.extra_services ?? []).length
      ? (o.extra_services ?? [])
          .map((i) => `${i.name} (${formatMoney(i.amount)})`)
          .join(", ")
      : EMPTY,
    guest_count: o.guest_count ? `${formatNumber(o.guest_count)} kişi` : EMPTY,
    notes: o.notes?.trim() || EMPTY,

    total_price: formatMoney(f.gross_amount),
    discount_amount: formatMoney(f.discount_amount),
    net_price: formatMoney(f.net_amount),
    paid_amount: formatMoney(f.collected_amount),
    remaining_amount: formatMoney(f.balance_amount),
    due_date: f.due_date ? formatDate(f.due_date) : EMPTY,

    contract_number: contractNumber,
    contract_date: formatDate(meta.contract_date),
  };
}

/**
 * {{degisken}} yer tutucularını doldurur.
 * Tanınmayan bir değişken metinde olduğu gibi bırakılır — sessizce silmek,
 * işletmenin yazım hatasını fark etmesini zorlaştırırdı.
 */
export function renderContractBody(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key: string) => {
    const value = values[key.toLowerCase()];
    return value === undefined ? match : value;
  });
}

/**
 * Sözleşme metnini bölümlere ayırır. Şablon Markdown benzeri yazılıyor:
 * "# " ana başlık, "## " bölüm başlığı, kalanı paragraf.
 * HTML üretmiyoruz — metin React tarafında düz metin olarak basılıyor.
 */
export type ContractBlock =
  | { kind: "title"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string };

export function parseContractBody(content: string): ContractBlock[] {
  const blocks: ContractBlock[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ kind: "paragraph", text });
    paragraph = [];
  };

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      flush();
      blocks.push({ kind: "heading", text: line.slice(3).trim() });
    } else if (line.startsWith("# ")) {
      flush();
      blocks.push({ kind: "title", text: line.slice(2).trim() });
    } else if (line === "") {
      flush();
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

/**
 * Dosya adı: Türkçe ve özel karakterler işletim sistemleri için normalize
 * edilir (ş → s, boşluk → tire vb.).
 */
export function contractFileName(
  contractNumber: string,
  customerName: string,
): string {
  const map: Record<string, string> = {
    ç: "c", Ç: "C", ğ: "g", Ğ: "G", ı: "i", İ: "I",
    ö: "o", Ö: "O", ş: "s", Ş: "S", ü: "u", Ü: "U",
  };
  const slug = customerName
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => map[ch] ?? ch)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `Sozlesme-${slug || "Musteri"}-${contractNumber}`;
}
