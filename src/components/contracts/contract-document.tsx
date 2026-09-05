import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { parseContractBody } from "@/lib/contracts";
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatPhone,
  formatTimeRange,
} from "@/lib/format";
import type { ContractSnapshot } from "@/lib/database.types";
import { IssuerLogo } from "./issuer-logo";

/**
 * A4 sözleşme belgesi. Hem ekrandaki önizlemede hem yazdırma sayfasında aynı
 * bileşen kullanılıyor; önizleme ile çıktı arasında fark olmaması için.
 *
 * Yazdırma kuralları globals.css içindeki `@media print` bloğunda.
 */
export function ContractDocument({
  snapshot,
  content,
  contractNumber,
}: {
  snapshot: ContractSnapshot;
  content: string;
  /** Henüz oluşturulmamış önizlemede numara yerine bilgi metni gösterilir. */
  contractNumber: string | null;
}) {
  const { business: b, customer: c, organization: o, finance: f } = snapshot;
  const blocks = parseContractBody(content);

  return (
    <article className="contract-sheet">
      {/* Başlık */}
      <header className="contract-header">
        <div className="contract-issuer">
          <IssuerLogo src={b.logo_url} businessName={b.name} />
          <div className="contract-issuer-meta">
            {b.address && <p>{[b.address, b.city].filter(Boolean).join(", ")}</p>}
            {b.phone && <p>Tel: {formatPhone(b.phone)}</p>}
            {b.email && <p>{b.email}</p>}
            {(b.tax_office || b.tax_number) && (
              <p>
                {[b.tax_office, b.tax_number].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        {/* Antette yalnızca künye: numara ve tarih. Belgenin adı aşağıda,
            ortada duruyor — resmî belgelerde alışılmış düzen bu. */}
        <div className="contract-meta">
          <p>
            <span>Sözleşme No</span>
            <strong>{contractNumber ?? "Oluşturulduğunda atanır"}</strong>
          </p>
          <p>
            <span>Tarih</span>
            <strong>{formatDate(snapshot.meta.contract_date)}</strong>
          </p>
        </div>
      </header>

      <h1 className="contract-doc-title">SÖZLEŞME</h1>

      <Section title="Müşteri Bilgileri">
        <Rows
          items={[
            ["Ad Soyad", c.full_name],
            ["Telefon", formatPhone(c.phone)],
            ["E-posta", c.email],
            ["Adres", c.address],
            ["T.C. Kimlik No", c.national_id],
          ]}
        />
      </Section>

      <Section title="Organizasyon Bilgileri">
        <Rows
          items={[
            ["Organizasyon türü", ORGANIZATION_TYPE_LABELS[o.type]],
            ["Salon", o.venue_name],
            ["Tarih", formatDate(o.event_date)],
            ["Saat", formatTimeRange(o.start_time, o.end_time)],
            [
              "Tahmini kişi sayısı",
              o.guest_count ? `${formatNumber(o.guest_count)} kişi` : null,
            ],
          ]}
        />
      </Section>

      <Section title="Paket / Hizmet Bilgileri">
        <Rows
          items={[
            ["Paket", o.package_name ?? "Paketsiz"],
            [
              "Kişi başı fiyat",
              f.unit_price ? formatMoney(f.unit_price) : null,
            ],
          ]}
        />

        {/* Hizmet kapsamı sözleşmenin en kritik maddesi; paket adı tek başına
            neyin verildiğini anlatmıyor. */}
        {o.included_services.length > 0 && (
          <div className="contract-services">
            <p className="contract-services-label">Pakete dahil hizmetler</p>
            <ul>
              {o.included_services.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          </div>
        )}

        {o.notes && (
          <div className="contract-services">
            <p className="contract-services-label">Notlar</p>
            <p className="contract-services-note">{o.notes}</p>
          </div>
        )}
      </Section>

      <Section title="Ödeme Bilgileri">
        <table className="contract-finance">
          <tbody>
            <tr>
              <th>Anlaşılan toplam bedel</th>
              <td>{formatMoney(f.gross_amount)}</td>
            </tr>
            {f.discount_amount > 0 && (
              <tr>
                <th>İndirim</th>
                <td>−{formatMoney(f.discount_amount)}</td>
              </tr>
            )}
            <tr className="contract-finance-strong">
              <th>Net sözleşme bedeli</th>
              <td>{formatMoney(f.net_amount)}</td>
            </tr>
            <tr>
              <th>Tahsil edilen</th>
              <td>{formatMoney(f.collected_amount)}</td>
            </tr>
            <tr className="contract-finance-strong">
              <th>Kalan bakiye</th>
              <td>{formatMoney(f.balance_amount)}</td>
            </tr>
            {f.due_date && (
              <tr>
                <th>Kalan ödeme tarihi</th>
                <td>{formatDate(f.due_date)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <section className="contract-terms">
        <h2 className="contract-section-title">Sözleşme Şartları</h2>
        {blocks.map((block, i) => {
          if (block.kind === "title") {
            return (
              <h3 key={i} className="contract-terms-title">
                {block.text}
              </h3>
            );
          }
          if (block.kind === "heading") {
            return (
              <h4 key={i} className="contract-terms-heading">
                {block.text}
              </h4>
            );
          }
          return (
            <p key={i} className="contract-terms-paragraph">
              {block.text}
            </p>
          );
        })}
      </section>

      <section className="contract-signatures">
        <div>
          <p className="contract-signature-role">İŞLETME</p>
          <p className="contract-signature-name">{b.name}</p>
          {b.authorized_person && (
            <p className="contract-signature-sub">{b.authorized_person}</p>
          )}
          <p className="contract-signature-line">Kaşe / İmza</p>
        </div>
        <div>
          <p className="contract-signature-role">MÜŞTERİ</p>
          <p className="contract-signature-name">{c.full_name}</p>
          <p className="contract-signature-sub">&nbsp;</p>
          <p className="contract-signature-line">İmza</p>
        </div>
      </section>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="contract-section">
      <h2 className="contract-section-title">{title}</h2>
      {children}
    </section>
  );
}

function Rows({ items }: { items: [string, string | null | undefined][] }) {
  const visible = items.filter(([, value]) => value);
  return (
    <dl className="contract-rows">
      {visible.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
