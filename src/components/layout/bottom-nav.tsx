"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Loader2,
  Menu,
  Plus,
  Store,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useSidebar } from "@/components/ui/sidebar";
import type { Lookups } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { loadReservationFormData } from "@/app/(app)/rezervasyonlar/actions";
import { ReservationFormDialog } from "@/app/(app)/rezervasyonlar/reservation-form-dialog";
import { useVertical } from "./vertical-provider";

const LEFT = [
  { href: "/panel", label: "Panel", icon: LayoutDashboard },
  { href: "/takvim", label: "Takvim", icon: CalendarDays },
];
const RIGHT = [{ href: "/rezervasyonlar", label: "Rezervasyon", icon: Store }];

/**
 * Mobilde alttan sabit gezinme çubuğu: iki yanda ikişer sekme, ortada
 * çentiğe oturan "yeni rezervasyon" düğmesi.
 *
 * Günlük işin ekranları burada; geri kalan her şey "Menü" ile açılan kenar
 * çubuğunda — ikinci bir menü listesi tutulmuyor. Masaüstünde gizli.
 */
export function BottomNav({ showFinance }: { showFinance: boolean }) {
  const pathname = usePathname();
  const { setOpenMobile, openMobile } = useSidebar();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  // Çubukta olmayan bir sayfadaysak (ör. Müşteriler) Menü etkin görünüyor.
  const onMenuPage = ![...LEFT, ...RIGHT].some((i) => isActive(i.href));

  return (
    <nav
      aria-label="Ana gezinme"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 md:hidden"
    >
      {/* Tek şekil gibi görünsün diye gölge üç parçanın birleşimine,
          kapsayıcıya uygulanıyor. */}
      <div className="flex h-16 drop-shadow-[0_4px_14px_rgb(0_0_0/0.14)] dark:drop-shadow-[0_6px_18px_rgb(0_0_0/0.45)]">
        <ul className="flex flex-1 rounded-l-[1.75rem] bg-card">
          {LEFT.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </ul>

        <svg
          aria-hidden
          viewBox="0 0 96 64"
          className="-mx-px h-16 w-24 shrink-0"
          preserveAspectRatio="none"
        >
          <path
            d="M0 0H4C17 0 21 9 25 19C30 33 37 44 48 44C59 44 66 33 71 19C75 9 79 0 92 0H96V64H0Z"
            fill="var(--card)"
          />
        </svg>

        <ul className="flex flex-1 rounded-r-[1.75rem] bg-card">
          {RIGHT.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setOpenMobile(true)}
              aria-expanded={openMobile}
              className="flex h-full w-full flex-col items-center justify-center gap-1"
            >
              <NavContent icon={Menu} label="Menü" active={onMenuPage} />
            </button>
          </li>
        </ul>
      </div>

      <NewReservationButton showFinance={showFinance} />
    </nav>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <li className="flex-1">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className="flex h-full flex-col items-center justify-center gap-1"
      >
        <NavContent icon={icon} label={label} active={active} />
      </Link>
    </li>
  );
}

function NavContent({
  icon: Icon,
  label,
  active,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <>
      <Icon
        className={cn("size-5", active ? "text-primary" : "text-muted-foreground")}
        strokeWidth={active ? 2.25 : 1.75}
      />
      <span
        className={cn(
          "text-[11px] leading-none",
          active ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </>
  );
}

/**
 * Ortadaki "+" — bulunulan sayfadan çıkmadan rezervasyon formunu açıyor.
 * Formun seçim listeleri her basışta çekiliyor: düzen her sayfada bunları
 * yüklemesin, liste de (yeni müşteri, yeni paket) hep güncel olsun.
 */
function NewReservationButton({ showFinance }: { showFinance: boolean }) {
  const router = useRouter();
  const sozluk = useVertical();
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function openForm() {
    startTransition(async () => {
      const result = await loadReservationFormData();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // Kaynağı olmayan işletmede form boş bir seçimle açılırdı; önce
      // tanımlama ekranına götür.
      if (!result.data.venues.some((v) => v.is_active)) {
        toast.info(
          `Rezervasyon için önce ${sozluk.resource.singular.toLocaleLowerCase("tr-TR")} ekleyin.`,
        );
        router.push("/salonlar");
        return;
      }
      setLookups(result.data);
      setOpen(true);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openForm}
        disabled={pending}
        aria-label="Yeni rezervasyon"
        className="absolute -top-6 left-1/2 grid size-14 -translate-x-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95 disabled:opacity-90"
      >
        {pending ? (
          <Loader2 className="size-6 animate-spin" />
        ) : (
          <Plus className="size-7" strokeWidth={2.5} />
        )}
      </button>

      {lookups && (
        <ReservationFormDialog
          customers={lookups.customers}
          venues={lookups.venues}
          teams={lookups.teams}
          packages={lookups.packages}
          showFinance={showFinance}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
