import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
      <SidebarTrigger className="-ml-1 md:hidden" />
      {back && (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="-ml-1 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Link href={back.href} aria-label={back.label} title={back.label}>
            <ArrowLeft />
          </Link>
        </Button>
      )}
      {/* min-w yerine 0 verilirse başlık sonsuza kadar küçülüyor ve eylemler
          asla alt satıra inmiyordu; detay sayfalarında başlık tek harfe
          düşüyordu. Okunabilir bir alt sınırla flex-wrap işini yapıyor:
          eylemler sığıyorsa aynı satırda, sığmıyorsa altta.

          Dar ekranda sıra değişiyor: eylemler üst satırda (geri okunun
          yanında), başlık altta tam genişlikte. order kullanıldığı için DOM
          sırası bozulmuyor — klavye ve ekran okuyucu başlığı önce görüyor. */}
      <div
        className={cn(
          "min-w-[9rem] flex-1",
          // Yalnızca detay sayfalarında (geri oku olanlar) dar ekranda
          // eylemler üste alınıyor. Liste sayfalarında tek eylem var ve
          // başlıkla aynı satıra rahat sığıyor; oraya ikinci satır eklemek
          // boşuna yükseklik olurdu.
          back && "max-sm:order-2 max-sm:w-full max-sm:flex-none",
        )}
      >
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="truncate text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div
          className={cn(
            "flex shrink-0 items-center gap-2 max-sm:ml-auto",
            back && "max-sm:order-1",
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
