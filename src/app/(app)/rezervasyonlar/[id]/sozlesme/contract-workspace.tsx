"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  MoreHorizontal,
  Share2,
  UserPen,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { VoidDialog } from "@/components/shared/void-dialog";
import { Notice } from "@/components/shared/notice";
import { ContractDocument } from "@/components/contracts/contract-document";
import { DocumentFrame } from "@/components/contracts/document-frame";
import { CONTRACT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime, whatsAppLink } from "@/lib/format";
import type { Business, Contract, ContractSnapshot, Customer } from "@/lib/database.types";
import { missingBusinessFields, missingCustomerFields } from "@/lib/contracts";
import { BusinessDialog } from "../../../panel/business-dialog";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { cancelContract, createContract, updateContractStatus } from "./actions";
import { useVertical } from "@/components/layout/vertical-provider";
import { CustomerFormDialog } from "../../../musteriler/customer-form-dialog";
import {
  ReservationFormDialog,
  type EditableReservation,
} from "../../reservation-form-dialog";
import type { Lookups, ReservationRow } from "@/lib/queries";
import { contractNoticeMessage } from "@/lib/reservation-notice";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";

export function ContractWorkspace({
  reservationId,
  reservation,
  shareUrl,
  lookups,
  business,
  canEditBusiness,
  customer,
  customerName,
  customerPhone,
  contract,
  templateBody,
  draftSnapshot,
  draftContent,
}: {
  reservationId: string;
  reservation: ReservationRow;
  /** Herkese açık sözleşme bağlantısı (/s/<kod>); sözleşme yoksa boş. */
  shareUrl: string;
  lookups: Lookups;
  business: Business;
  /** İşletme bilgisini yalnızca sahip/yönetici düzenleyebiliyor. */
  canEditBusiness: boolean;
  customer: Customer;
  customerName: string;
  customerPhone: string;
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
  const sozluk = useVertical();

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

        {kapsamsiz && <ScopeNotice reservation={reservation} lookups={lookups} />}

        <MissingBusinessNotice
          business={business}
          templateBody={templateBody}
          canEdit={canEditBusiness}
        />

        <MissingCustomerNotice customer={customer} templateBody={templateBody} />

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
  const notice = contractNoticeMessage(
    {
      reservation,
      customerName,
      businessName: business.name,
      showFinance: true,
      sozluk,
    },
    shareUrl,
  );
  const notifyHref = whatsAppLink(customerPhone, notice);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <div>
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

        </div>

        {/* Müşteriye bilgi: rezervasyon bilgisi + sözleşme bağlantısı. Otomatik
            gönderilmiyor; WhatsApp hazır mesajla açılıyor, gönderen işletme. */}
        {!cancelled && (
          // ghost: varsayılan varyant (btn-gradient-border) kendi zeminini
          // çizip WhatsApp yeşilini eziyordu.
          <Button
            variant="ghost"
            asChild={Boolean(notifyHref)}
            disabled={!notifyHref}
            title={notifyHref ? undefined : "Müşterinin telefon numarası yok"}
            className="mt-4 w-full bg-[#15803D] font-semibold text-white hover:bg-[#166534] hover:text-white sm:w-auto"
          >
            {notifyHref ? (
              <a href={notifyHref} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon />
                Müşteriyi bilgilendir
              </a>
            ) : (
              <span>
                <WhatsAppIcon />
                Müşteriyi bilgilendir
              </span>
            )}
          </Button>
        )}

        {/* Belge işlemleri: dar ekranda tek satırda üç eşit düğme. */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          <Button variant="outline" asChild>
            <a href={printHref} target="_blank" rel="noopener noreferrer">
              <Printer />
              Yazdır
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`${printHref}?hedef=pdf`} target="_blank" rel="noopener noreferrer">
              <Download />
              PDF<span className="hidden sm:inline"> indir</span>
            </a>
          </Button>
          <ShareButton
            title={`Sözleşme ${contract.contract_number}`}
            message={notice}
            url={shareUrl}
          />
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
            {/* Ana işlem görünür; seyrek kullanılan yeniden oluşturma ve iptal
                "⋯" menüsünde — mobilde kart beş satır tutuyordu. Pencereler
                menünün içinde: onSelect engellenmezse menü kapanırken
                pencere de kapanıyor. */}
            <div className="flex gap-2">
              {contract.status !== "imzalandi" && (
                <ConfirmDialog
                  destructive={false}
                  trigger={
                    <Button variant="outline" className="flex-1 sm:flex-none">
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Diğer işlemler" title="Diğer işlemler">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-52">
                  <ConfirmDialog
                    destructive={false}
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <RefreshCw />
                        Yeniden oluştur
                      </DropdownMenuItem>
                    }
                    title="Sözleşmeyi yeniden oluştur"
                    description="Rezervasyon, müşteri veya fiyat bilgileri değiştiyse güncel verilerle yeni bir sürüm hazırlanır. Sözleşme numarası aynı kalır, sürüm numarası artar. Mevcut sürüm kayıtlarda saklanmaya devam eder."
                    confirmLabel="Yeni sürüm oluştur"
                    successMessage="Sözleşmenin yeni sürümü oluşturuldu."
                    onConfirm={() => createContract(reservationId)}
                  />
                  <VoidDialog
                    trigger={
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Ban />
                        Sözleşmeyi iptal et
                      </DropdownMenuItem>
                    }
                    title="Sözleşmeyi iptal et"
                    description="Sözleşme silinmez; iptal edilmiş olarak işaretlenir ve nedeni kayıtta kalır."
                    successMessage="Sözleşme iptal edildi."
                    onVoid={(reason) =>
                      cancelContract(contract.id, reservationId, reason)
                    }
                  />
                </DropdownMenuContent>
              </DropdownMenu>
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


/**
 * Telefonun paylaşım menüsü (Web Share API): aynı bilgilendirme mesajı
 * başka bir uygulamaya da gönderilebilsin. Menü yoksa bağlantı panoya
 * kopyalanıyor; WhatsApp için ayrı, belirgin düğme var.
 */
function ShareButton({ title, message, url }: { title: string; message: string; url: string }) {
  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        // Bağlantı metnin içinde: url ayrıca verilirse bazı uygulamalar iki
        // kez ekliyor.
        await navigator.share({ title, text: message });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Sözleşme bağlantısı kopyalandı.");
    } catch {
      toast.error("Bağlantı kopyalanamadı.");
    }
  }

  return (
    <Button variant="outline" onClick={() => void share()}>
      <Share2 />
      Paylaş
    </Button>
  );
}

/**
 * Sözleşmede boş kalacak müşteri bilgileri ve onları yerinde tamamlama.
 *
 * Müşteri penceresi bu sayfadan açılıyor; kaydedince sayfa yenileniyor ve
 * önizleme yeni bilgilerle yeniden hazırlanıyor. Müşteri sayfasına gidip
 * dönmek gerekmiyor.
 */
function MissingCustomerNotice({
  customer,
  templateBody,
}: {
  customer: Customer;
  templateBody: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const missing = missingCustomerFields(customer, templateBody);
  if (missing.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning/10 px-3.5 py-3 text-sm text-warning-foreground dark:text-warning">
      <p>
        Sözleşmede eksik bilgi var: <strong>{missing.join(", ")}</strong>. Bu
        alanlar belgede boş kalacak.
      </p>
      <CustomerFormDialog
        customer={customer}
        open={open}
        onOpenChange={setOpen}
        onSaved={() => router.refresh()}
      />
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <UserPen />
        Bilgileri tamamla
      </Button>
    </div>
  );
}

/**
 * Hizmet kapsamı boş uyarısı ve yerinde tamamlama: rezervasyon penceresi bu
 * sayfada açılıyor, paket seçilip ya da kapsam nota yazılıp kaydedilince
 * önizleme yenileniyor.
 */
function ScopeNotice({
  reservation,
  lookups,
}: {
  reservation: EditableReservation;
  lookups: Lookups;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning/10 px-3.5 py-3 text-sm text-warning-foreground dark:text-warning">
      <p>
        Bu sözleşmede hizmet kapsamı tanımlı değil: paket seçilmemiş ve
        rezervasyon notu boş. Belge neyin verileceğini yazmayacak. Paket seçin
        ya da kapsamı rezervasyon notuna yazın.
      </p>
      <ReservationFormDialog
        reservation={reservation}
        customers={lookups.customers}
        venues={lookups.venues}
        teams={lookups.teams}
        packages={lookups.packages}
        showFinance
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // Kayıt yolu /rezervasyonlar/[id]'yi tazeliyor; bu alt sayfa için
          // kapanınca yenile ki önizleme yeni paket/notla hazırlansın.
          if (!next) router.refresh();
        }}
      />
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil />
        Bilgileri tamamla
      </Button>
    </div>
  );
}

/**
 * Sözleşmede boş kalacak işletme bilgileri. Yönetici aynı sayfada açılan
 * pencereden dolduruyor; diğer kullanıcılara kimin doldurabileceği söyleniyor.
 */
function MissingBusinessNotice({
  business,
  templateBody,
  canEdit,
}: {
  business: Business;
  templateBody: string;
  canEdit: boolean;
}) {
  const missing = missingBusinessFields(business, templateBody);
  if (missing.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning/10 px-3.5 py-3 text-sm text-warning-foreground dark:text-warning">
      <p>
        İşletme bilgisi eksik: <strong>{missing.join(", ")}</strong>. Bu alanlar
        sözleşmede boş kalacak.
        {!canEdit && " İşletme sahibi ya da yönetici Ayarlar → İşletme bölümünden doldurabilir."}
      </p>
      {canEdit && <BusinessDialog business={business} label="Bilgileri tamamla" alwaysShowLabel />}
    </div>
  );
}
