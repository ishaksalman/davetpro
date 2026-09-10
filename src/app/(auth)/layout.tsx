import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";

const HIGHLIGHTS = [
  "Takvimde boş ve dolu tarihleri tek bakışta görün",
  "Kapora ve ara ödemeleri takip edin, kalan tutar kendiliğinden çıksın",
  "Her organizasyonun kârını ayrı ayrı ölçün",
];

/** Giriş, kayıt ve şifre sayfaları arama sonuçlarında yer almasın. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
      {/* Marka paneli — mobilde gizlenir, form öne çıkar. */}
      <aside className="relative hidden overflow-hidden bg-brand p-12 text-brand-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 size-[28rem] rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-20 size-[24rem] rounded-full bg-white/10 blur-3xl"
        />

        <Logo className="relative text-brand-foreground" />

        <div className="relative max-w-md">
          <h1 className="hero-gradient-text text-balance leading-[1.15] tracking-tight">
            Salonunuzun tüm işi tek bir panelde.
          </h1>
          <ul className="mt-8 space-y-4 text-brand-foreground/80">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-foreground/50" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-brand-foreground/60">
          Düğün, nişan, kına ve kurumsal organizasyonlar için.
        </p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
