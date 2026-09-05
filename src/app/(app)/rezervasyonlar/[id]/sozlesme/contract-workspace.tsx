"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Pencil,
  Info,
  Printer,
  RefreshCw,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { VoidDialog } from "@/components/shared/void-dialog";
import { Notice } from "@/components/shared/notice";
import { ContractDocument } from "@/components/contracts/contract-document";
import { CONTRACT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime, whatsAppLink } from "@/lib/format";
import type { Contract, ContractSnapshot } from "@/lib/database.types";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { cancelContract, createContract, updateContractStatus } from "./actions";

export function ContractWorkspace({
  reservationId,
  customerName,
  customerPhone,
  eventDate,
  contract,
  templateBody,
  draftSnapshot,
  draftContent,
}: {
  reservationId: string;
  customerName: string;
  customerPhone: string;
  eventDate: string;
  contract: Contract | null;
  templateBody: string;
  draftSnapshot: ContractSnapshot;
  draftContent: string;
}) {
  /** Yeni sürüm hazırlanırken açılan taslak düzenleyici. */
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(templateBody);
  const [pending, startTransition] = useTransition();
  const guard = useSubmitGuard();

  const printHref = `/rezervasyonlar/${reservationId}/sozlesme/yazdir`;

  // Paket, hizmet listesi ve not hepsi boşsa belge neyin satıldığını
  // söylemiyor. Engellemiyoruz — şablonun kendi metni kapsamı anlatıyor
  // olabilir — ama kullanıcı bunu bilerek geçmeli.
  const org = draftSnapshot.organization;
  const kapsamsiz =
    !org.package_name &&
    org.included_services.length === 0 &&
    !org.notes?.trim();

  function generate(bodyOverride?: string) {
    if (!guard.begin()) return;
    startTransition(async () => {
      try {
        const result = await createContract(reservationId, bodyOverride);
        if (result.ok) {
          toast.success("Sözleşme oluşturuldu.");
          setEditing(false);
        } else {
          toast.error(result.error);
        }
      } finally {
        guard.end();
      }
    });
  }

  if (!templateBody) {
    return (
      <Notice>
        Sözleşme şablonu tanımlı değil. Sözleşme oluşturabilmek için önce
        Ayarlar → Sözleşme sekmesinden metni tanımlamanız gerekiyor.
      </Notice>
    );
  }

  // --- Kayıtlı sözleşme yok: önizleme + oluştur --------------------------
  if (!contract) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Sözleşme önizlemesi</h2>
            <p className="text-sm text-muted-foreground">
              Aşağıdaki belge, rezervasyonun bugünkü verileriyle hazırlandı.
              Onayladığınızda numara verilip kayıt altına alınır.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEditing((v) => !v)}
              disabled={pending}
            >
              <Pencil />
              {editing ? "Düzenlemeyi kapat" : "Metni düzenle"}
            </Button>
            <Button
              onClick={() => generate(editing ? body : undefined)}
              disabled={pending}
            >
              {pending ? <Loader2 className="animate-spin" /> : <FileText />}
              Sözleşmeyi oluştur
            </Button>
          </div>
        </div>

        {kapsamsiz && (
          <Notice>
            Bu sözleşmede hizmet kapsamı tanımlı değil: paket seçilmemiş ve
            rezervasyon notu boş. Belge neyin verileceğini yazmayacak. Paket
            seçmenizi ya da kapsamı rezervasyon notuna yazmanızı öneririz.
          </Notice>
        )}

        {editing && (
          <div className="space-y-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              spellCheck={false}
              className="font-mono text-xs leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              Bu düzenleme yalnızca bu sözleşme için geçerlidir; Ayarlar&apos;daki
              şablon değişmez. Önizleme, oluşturduktan sonra güncellenir.
            </p>
          </div>
        )}

        <DocumentFrame>
          <ContractDocument
            snapshot={draftSnapshot}
            content={editing ? body : draftContent}
            contractNumber={null}
          />
        </DocumentFrame>
      </div>
    );
  }

  // --- Kayıtlı sözleşme var ---------------------------------------------
  const snapshot = contract.snapshot;
  const cancelled = contract.status === "iptal";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="tabular font-medium">
                {contract.contract_number}
              </span>
              {contract.version > 1 && (
                <Badge variant="outline">{contract.version}. sürüm</Badge>
              )}
              <Badge variant={cancelled ? "destructive" : "secondary"}>
                {CONTRACT_STATUS_LABELS[contract.status]}
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {snapshot.meta.created_by_name} tarafından{" "}
              {formatDateTime(contract.created_at)} tarihinde oluşturuldu.
              {contract.signed_at &&
                ` İmzalandı: ${formatDate(contract.signed_at)}.`}
            </p>
            {cancelled && contract.cancel_reason && (
              <p className="mt-1 text-sm text-destructive">
                İptal nedeni: {contract.cancel_reason}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={printHref} target="_blank" rel="noopener noreferrer">
                <Printer />
                Yazdır
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href={`${printHref}?hedef=pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download />
                PDF indir
              </a>
            </Button>
            <ShareButton
              contractNumber={contract.contract_number}
              customerName={customerName}
              customerPhone={customerPhone}
              eventDate={eventDate}
            />
          </div>
        </div>

        {/* İptal edilen sözleşme geçmişte kalır ama rezervasyon devam
            ediyorsa yenisinin hazırlanabilmesi gerekir. Eskiden bu durumda
            aksiyon çubuğunun tamamı gizleniyordu ve yeni sözleşme
            oluşturmanın hiçbir yolu kalmıyordu. */}
        {cancelled && (
          <>
            <Separator className="my-4" />
            <ConfirmDialog
              destructive={false}
              trigger={
                <Button size="sm">
                  <RefreshCw />
                  Yeni sözleşme oluştur
                </Button>
              }
              title="Yeni sözleşme oluştur"
              description="Güncel bilgilerle yeni bir sürüm hazırlanır. Sözleşme numarası aynı kalır, sürüm numarası artar. İptal edilen sürüm nedeniyle birlikte kayıtlarda kalmaya devam eder."
              confirmLabel="Oluştur"
              successMessage="Yeni sözleşme oluşturuldu."
              onConfirm={() => createContract(reservationId)}
            />
          </>
        )}

        {!cancelled && (
          <>
            <Separator className="my-4" />
            <div className="flex flex-wrap gap-2">
              {contract.status !== "imzalandi" && (
                <ConfirmDialog
                  destructive={false}
                  trigger={
                    <Button variant="outline" size="sm">
                      <CheckCircle2 />
                      İmzalandı olarak işaretle
                    </Button>
                  }
                  title="Sözleşme imzalandı mı?"
                  description="Sözleşmenin taraflarca imzalandığını kaydedersiniz. Bu işlem yalnızca durumu günceller."
                  confirmLabel="İmzalandı"
                  successMessage="Sözleşme imzalandı olarak işaretlendi."
                  onConfirm={() =>
                    updateContractStatus(contract.id, reservationId, "imzalandi")
                  }
                />
              )}

              <ConfirmDialog
                destructive={false}
                trigger={
                  <Button variant="outline" size="sm">
                    <RefreshCw />
                    Yeniden oluştur
                  </Button>
                }
                title="Sözleşmeyi yeniden oluştur"
                description="Rezervasyon, müşteri veya fiyat bilgileri değiştiyse güncel verilerle yeni bir sürüm hazırlanır. Sözleşme numarası aynı kalır, sürüm numarası artar. Mevcut sürüm kayıtlarda saklanmaya devam eder."
                confirmLabel="Yeni sürüm oluştur"
                successMessage="Sözleşmenin yeni sürümü oluşturuldu."
                onConfirm={() => createContract(reservationId)}
              />

              <VoidDialog
                trigger={
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Ban />
                    Sözleşmeyi iptal et
                  </Button>
                }
                title="Sözleşmeyi iptal et"
                description="Sözleşme silinmez; iptal edilmiş olarak işaretlenir ve nedeni kayıtta kalır."
                successMessage="Sözleşme iptal edildi."
                onVoid={(reason) =>
                  cancelContract(contract.id, reservationId, reason)
                }
              />
            </div>
          </>
        )}
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3.5 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          Bu belge oluşturulduğu andaki verileri taşır. Rezervasyon veya müşteri
          bilgileri sonradan değişse bile metin kendiliğinden güncellenmez;
          güncel bilgilerle bir belge gerekiyorsa &quot;Yeniden oluştur&quot; ile
          yeni sürüm hazırlayın.
        </span>
      </p>

      <DocumentFrame>
        <ContractDocument
          snapshot={snapshot}
          content={contract.content}
          contractNumber={contract.contract_number}
        />
      </DocumentFrame>
    </div>
  );
}

/** A4 sayfayı ekranda kağıt gibi göstermek için gri zemin + gölge. */
function DocumentFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-muted/50 p-4 sm:p-8">
      <div className="mx-auto w-fit shadow-lg">{children}</div>
    </div>
  );
}

/**
 * Web Share API varsa yerel paylaşım penceresi açılır, yoksa WhatsApp'a
 * hazır mesaj bırakılır. Dosya eklentisi gönderilmiyor — kullanıcıya bunun
 * açıkça söylenmesi, olmayan bir entegrasyonu ima etmekten iyi.
 */
function ShareButton({
  contractNumber,
  customerName,
  customerPhone,
  eventDate,
}: {
  contractNumber: string;
  customerName: string;
  customerPhone: string;
  eventDate: string;
}) {
  const message = `Merhaba ${customerName}, ${formatDate(eventDate)} tarihli organizasyonunuz için hazırladığımız ${contractNumber} numaralı sözleşmeyi paylaşıyorum.`;

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `Sözleşme ${contractNumber}`, text: message });
        return;
      } catch (error) {
        // Kullanıcı vazgeçtiyse sessizce çık; başka hatada WhatsApp'a düş.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    const href = whatsAppLink(customerPhone, message);
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
      toast.info("Sözleşme dosyasını sohbete kendiniz eklemeniz gerekir.");
    } else {
      toast.error("Müşterinin telefon numarası bulunamadı.");
    }
  }

  return (
    <Button variant="outline" onClick={() => void share()}>
      Paylaş
    </Button>
  );
}
