import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Her sayfanın üst şeridi. Yapışkan (sticky) olduğu için uzun tablolarda
 * başlık ve birincil eylem her zaman erişilebilir kalır.
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Detay sayfalarında başlığın solunda çıkan geri oku. */
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 border-b bg-background/85 px-4 py-3 backdrop-blur-sm sm:px-6",
        className,
      )}
    >
      {/* Geri oku ve başlık tek grup: dar ekranda da hep aynı satırda.
          Uzun başlık kısalıyor (truncate), satırı bölmüyor.

          min-w yerine 0 verilirse başlık sonsuza kadar küçülüyor ve eylemler
          asla alt satıra inmiyordu; detay sayfalarında başlık tek harfe
          düşüyordu. Okunabilir bir alt sınırla flex-wrap işini yapıyor:
          eylemler sığıyorsa aynı satırda, sığmıyorsa altta. */}
      <div className="flex min-w-[9rem] flex-1 items-center gap-2">
        {back && (
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="-ml-2 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Link href={back.href} aria-label={back.label} title={back.label}>
              <ArrowLeft />
            </Link>
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="truncate text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div
          className={cn(
            "flex shrink-0 items-center gap-2 max-sm:ml-auto",
            // Detay sayfalarında eylemler (durum, düzenle, dönüştür…) dar
            // ekranda başlığın altına, sağa yaslı iniyor: başlıkla aynı
            // satırda kalsalar başlık birkaç harfe düşüyordu.
            back && "max-sm:w-full max-sm:justify-end",
          )}
        >
          {actions}
        </div>
      )}
    </header>
  );
}

export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 space-y-6 p-4 sm:p-6", className)}>{children}</div>
  );
}
