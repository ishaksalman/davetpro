"use client";

import { useState, useTransition } from "react";
import { Download, FileText, Loader2, Printer, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { QUOTE_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatMoney, whatsAppLink } from "@/lib/format";
import type { Package, Quote, QuoteItem, Venue } from "@/lib/database.types";
import { QuoteFormDialog } from "./quote-form-dialog";
import { updateQuoteStatus } from "../actions";

export function QuotePanel({
  leadId,
  quotes,
  items,
  venues,
  packages,
  defaults,
  customerName,
  customerPhone,
  eventDate,
  showFinance,
  locked,
}: {
  leadId: string;
  quotes: Quote[];
  items: QuoteItem[];
  venues: Venue[];
  packages: Package[];
  defaults: {
    venue_id: string | null;
    package_id: string | null;
    guest_count: number | null;
  };
  customerName: string;
  customerPhone: string;
  eventDate: string | null;
  showFinance: boolean;
  locked: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(quotes[0]?.id ?? null);

  if (!showFinance) {
    return (
      <section className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
        Teklifleri görüntüleme yetkiniz bulunmuyor.
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="font-medium">Teklifler</h2>
          <p className="text-xs text-muted-foreground">
            {quotes.length === 0
              ? "Henüz teklif verilmedi"
              : `${quotes.length} sürüm · eski sürümler saklanır`}
          </p>
        </div>
        {!locked && (
          <QuoteFormDialog
            leadId={leadId}
            venues={venues}
            packages={packages}
            defaults={defaults}
            isRevision={quotes.length > 0}
          />
        )}
      </header>

      {quotes.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          Paket ve ek hizmetleri seçerek ilk teklifi oluşturun.
        </p>
      ) : (
        <ul className="divide-y">
          {quotes.map((quote) => {
            const quoteItems = items.filter((i) => i.quote_id === quote.id);
            const open = expanded === quote.id;
            return (
              <li key={quote.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : quote.id)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span className="font-medium">Teklif #{quote.version}</span>
                    <span className="tabular text-xs text-muted-foreground">
                      {quote.quote_number}
                    </span>
                    <Badge
                      variant={
                        quote.status === "kabul"
                          ? "secondary"
                          : quote.status === "reddedildi" || quote.status === "suresi_doldu"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {QUOTE_STATUS_LABELS[quote.status]}
                    </Badge>
                  </button>
                  <span className="tabular font-semibold">
                    {formatMoney(quote.total_amount)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(quote.created_at)}
                  {quote.valid_until &&
                    ` · Geçerlilik: ${formatDate(quote.valid_until)}`}
                </p>

                {open && (
                  <div className="mt-3 space-y-3">
                    <table className="w-full text-sm">
                      <tbody>
                        <Row label="Paket" value={formatMoney(quote.package_amount)} />
                        {quoteItems.map((item) => (
                          <Row
                            key={item.id}
                            label={item.name}
                            value={formatMoney(item.amount)}
                          />
                        ))}
                        {quote.discount_amount > 0 && (
                          <Row
                            label="İndirim"
                            value={`−${formatMoney(quote.discount_amount)}`}
                          />
                        )}
                        <tr className="border-t font-semibold">
                          <td className="py-2">Toplam</td>
                          <td className="tabular py-2 text-right">
                            {formatMoney(quote.total_amount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {quote.notes && (
                      <p className="text-sm whitespace-pre-line text-muted-foreground">
                        {quote.notes}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={`/talepler/${leadId}/teklif/${quote.id}/yazdir`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Printer />
                          Yazdır
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={`/talepler/${leadId}/teklif/${quote.id}/yazdir?hedef=pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download />
                          PDF indir
                        </a>
                      </Button>
                      <ShareQuoteButton
                        quote={quote}
                        leadId={leadId}
                        customerName={customerName}
                        customerPhone={customerPhone}
                        eventDate={eventDate}
                      />
                      {/* Paylaş düğmesi bunu kendiliğinden yapıyor; bu seçenek
                          teklifi başka yolla ileten (e-posta, elden, basılı)
                          kullanıcı için duruyor. Zaten gönderilmişse gizli. */}
                      {!locked && quote.status === "taslak" && (
                          <ConfirmDialog
                            destructive={false}
                            trigger={
                              <Button variant="ghost" size="sm">
                                <Send />
                                Gönderildi olarak işaretle
                              </Button>
                            }
                            title="Teklif gönderildi mi?"
                            description="Teklifi müşteriye başka bir yolla ilettiyseniz burada işaretleyin. Paylaş düğmesini kullandığınızda bu kendiliğinden yapılır."
                            confirmLabel="Gönderildi"
                            successMessage="Teklif gönderildi olarak işaretlendi."
                            onConfirm={() =>
                              updateQuoteStatus(quote.id, leadId, "gonderildi")
                            }
                          />
                        )}
                      {/* Yanlış girilen veya müşterinin kabul etmediği teklif
                          kapatılabilmeli. Silinmiyor: teklif geçmişi, müşteriye
                          ne söz verildiğinin kaydı. */}
                      {!locked &&
                        (quote.status === "taslak" || quote.status === "gonderildi") && (
                          <ConfirmDialog
                            trigger={
                              <Button variant="ghost" size="sm" className="text-muted-foreground">
                                <X />
                                Kapat
                              </Button>
                            }
                            title="Teklifi kapat"
                            description="Teklif reddedildi olarak işaretlenir. Kayıt silinmez; geçmişte görünmeye devam eder."
                            confirmLabel="Reddedildi olarak kapat"
                            successMessage="Teklif kapatıldı."
                            onConfirm={() =>
                              updateQuoteStatus(quote.id, leadId, "reddedildi")
                            }
                          />
                        )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-1.5 text-muted-foreground">{label}</td>
      <td className="tabular py-1.5 text-right">{value}</td>
    </tr>
  );
}

/**
 * Web Share API varsa yerel paylaşım penceresi, yoksa WhatsApp'a hazır mesaj.
 * PDF dosyası eklenmiyor; kullanıcıya bu açıkça söyleniyor.
 *
 * Paylaşımdan sonra teklif "Gönderildi" olarak işaretleniyor — kullanıcının
 * ayrıca o düğmeye basması gereksiz bir adımdı. İşaretleme yalnızca taslak
 * teklifler için; kabul/red gibi ilerlemiş durumlar geri alınmıyor.
 */
function ShareQuoteButton({
  quote,
  leadId,
  customerName,
  customerPhone,
  eventDate,
}: {
  quote: Quote;
  leadId: string;
  customerName: string;
  customerPhone: string;
  eventDate: string | null;
}) {
  const [pending, startTransition] = useTransition();

  function markSent() {
    if (quote.status !== "taslak") return;
    startTransition(async () => {
      const result = await updateQuoteStatus(quote.id, leadId, "gonderildi");
      if (result.ok) toast.success("Teklif gönderildi olarak işaretlendi.");
      else toast.error(result.error);
    });
  }

  const message =
    `Merhaba ${customerName},\n` +
    (eventDate ? `${formatDate(eventDate)} tarihli ` : "") +
    `organizasyonunuz için hazırladığımız teklif hazır.\n\n` +
    `Toplam teklif: ${formatMoney(quote.total_amount)}\n` +
    (quote.valid_until
      ? `Geçerlilik tarihi: ${formatDate(quote.valid_until)}\n`
      : "") +
    `\nDetayları ${quote.quote_number} numaralı teklif belgesinden inceleyebilirsiniz.`;

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `Teklif ${quote.quote_number}`, text: message });
        // Paylaşım penceresi tamamlandı: gönderildi saymak güvenli.
        markSent();
        return;
      } catch (error) {
        // Vazgeçildiyse işaretleme yapılmaz.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    const href = whatsAppLink(customerPhone, message);
    if (!href) {
      toast.error("Müşterinin telefon numarası bulunamadı.");
      return;
    }

    window.open(href, "_blank", "noopener,noreferrer");
    // WhatsApp'ta mesajın gerçekten gönderildiğini bilemiyoruz; sohbetin hazır
    // mesajla açılmasını "gönderildi" saymak makul, ama kullanıcıya söyleniyor.
    toast.info(
      "WhatsApp açıldı. Teklif dosyasını sohbete kendiniz eklemelisiniz." +
        (quote.status === "taslak" ? " Teklif gönderildi olarak işaretlendi." : ""),
    );
    markSent();
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => void share()}
    >
      {pending ? <Loader2 className="animate-spin" /> : <FileText />}
      Paylaş
    </Button>
  );
}
