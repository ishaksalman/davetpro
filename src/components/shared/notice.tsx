import { AlertTriangle } from "lucide-react";

/**
 * Sayfayı bozmayan ama kullanıcının bilmesi gereken durumlar için satır uyarısı
 * (ör. liste üst sınıra dayandığı için eksik olabilir).
 */
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-lg bg-warning/10 px-3.5 py-3 text-sm text-warning-foreground dark:text-warning"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}
