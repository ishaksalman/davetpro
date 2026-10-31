import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

/**
 * Panel içindeki notFound() (silinmiş rezervasyon, başka işletmenin kaydı).
 * Kök not-found tanıtım sitesinin görünümünde; panelde çalışan kullanıcıyı
 * oraya atmak yerine kenar çubuğu yerinde kalıyor.
 */
export default function AppNotFound() {
  return (
    <div className="p-6">
      <EmptyState
        icon={SearchX}
        title="Kayıt bulunamadı"
        description="Silinmiş ya da size ait olmayan bir kayda ulaşmaya çalışıyorsunuz."
        action={
          <Button asChild variant="outline">
            <Link href="/panel">Panele dön</Link>
          </Button>
        }
      />
    </div>
  );
}
