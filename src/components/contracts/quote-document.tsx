import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatPhone,
  formatTimeRange,
} from "@/lib/format";
import type { Business, OrganizationType } from "@/lib/database.types";

export type QuoteDocumentData = {
  quote_number: string;
  version: number;
  created_at: string;
  valid_until: string | null;
  package_name: string | null;
  package_amount: number;
  discount_amount: number;
  total_amount: number;
  items: { id: string; name: string; amount: number }[];
  notes: string | null;
  guest_count: number | null;
  customer_name: string;
  customer_phone: string | null;
  venue_name: string | null;
  organization_type: OrganizationType;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
};

/**
 * A4 teklif belgesi.
 *
 * Sözleşme belgesiyle aynı `.contract-sheet` stil ailesini kullanıyor:
 * kağıt ölçüsü, sayfa sonu kuralları ve baskı davranışı tek yerde tanımlı.
 */
export function QuoteDocument({
  business,
  quote,
}: {
  business: Business;
  quote: QuoteDocumentData;
}) {
  return (
    <article className="contract-sheet">
      <header className="contract-header">
        <div className="contract-issuer">
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt="" className="contract-logo" />
          ) : (
            <p className="contract-issuer-name">{business.name}</p>
          )}
          <div className="contract-issuer-meta">
            {business.address && (
              <p>{[business.address, business.city].filter(Boolean).join(", ")}</p>
            )}
            {business.phone && <p>Tel: {formatPhone(business.phone)}</p>}
            {business.email && <p>{business.email}</p>}
          </div>
        </div>

        {/* Antette yalnızca künye; belgenin adı aşağıda, ortada. */}
        <div className="contract-meta">
          <p>
            <span>Teklif No</span>
            <strong>{quote.quote_number}</strong>
          </p>
          <p>
            <span>Tarih</span>
            <strong>{formatDate(quote.created_at)}</strong>
          </p>
          {quote.valid_until && (
            <p>
              <span>Geçerlilik</span>
              <strong>{formatDate(quote.valid_until)}</strong>
            </p>
          )}
        </div>
      </header>

      <h1 className="contract-doc-title">TEKLİF</h1>

      <section className="contract-section">
        <h2 className="contract-section-title">Müşteri</h2>
        <dl className="contract-rows">
          <div>
            <dt>Ad Soyad</dt>
            <dd>{quote.customer_name}</dd>
          </div>
          {quote.customer_phone && (
            <div>
              <dt>Telefon</dt>
              <dd>{formatPhone(quote.customer_phone)}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="contract-section">
        <h2 className="contract-section-title">Organizasyon</h2>
        <dl className="contract-rows">
          <div>
            <dt>Tür</dt>
            <dd>{ORGANIZATION_TYPE_LABELS[quote.organization_type]}</dd>
          </div>
          {quote.venue_name && (
            <div>
              <dt>Salon</dt>
              <dd>{quote.venue_name}</dd>
            </div>
          )}
          {quote.event_date && (
            <div>
              <dt>Tarih</dt>
              <dd>{formatDate(quote.event_date)}</dd>
            </div>
          )}
          {quote.start_time && quote.end_time && (
            <div>
              <dt>Saat</dt>
              <dd>{formatTimeRange(quote.start_time, quote.end_time)}</dd>
            </div>
          )}
          {quote.guest_count && (
            <div>
              <dt>Kişi sayısı</dt>
              <dd>{formatNumber(quote.guest_count)} kişi</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="contract-section">
        <h2 className="contract-section-title">Teklif Detayı</h2>
        <table className="contract-finance">
          <tbody>
            <tr>
              <th>{quote.package_name ?? "Paket / hizmet bedeli"}</th>
              <td>{formatMoney(quote.package_amount)}</td>
            </tr>
            {quote.items.map((item) => (
              <tr key={item.id}>
                <th>{item.name}</th>
                <td>{formatMoney(item.amount)}</td>
              </tr>
            ))}
            {quote.discount_amount > 0 && (
              <tr>
                <th>İndirim</th>
                <td>−{formatMoney(quote.discount_amount)}</td>
              </tr>
            )}
            <tr className="contract-finance-strong">
              <th>TOPLAM</th>
              <td>{formatMoney(quote.total_amount)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {quote.notes && (
        <section className="contract-section">
          <h2 className="contract-section-title">Notlar</h2>
          <p className="contract-terms-paragraph">{quote.notes}</p>
        </section>
      )}

      <section className="contract-section">
        <p className="contract-issuer-meta">
          {quote.valid_until
            ? `Bu teklif ${formatDate(quote.valid_until)} tarihine kadar geçerlidir.`
            : "Bu teklif bilgilendirme amaçlıdır; kesin rezervasyon sözleşme ile kurulur."}
        </p>
      </section>
    </article>
  );
}
