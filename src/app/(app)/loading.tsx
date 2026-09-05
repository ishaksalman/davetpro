import { Skeleton } from "@/components/ui/skeleton";

/**
 * Sayfa verisi beklenirken anında görünür.
 * Sidebar yerinde kalır; kullanıcı tıkladığı anda geçişin başladığını görür,
 * eski sayfada donmuş gibi hissetmez.
 */
export default function Loading() {
  return (
    <>
      <div className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="mt-3 h-7 w-32" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-3.5">
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-4 py-4 last:border-0">
              <Skeleton className="h-4 w-20 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24 shrink-0" />
              <Skeleton className="h-4 w-20 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
