import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Bento } from "@/components/marketing/bento";
import { CtaBand } from "@/components/marketing/cta-band";
import { FeatureCards } from "@/components/marketing/feature-cards";
import { FeatureSections } from "@/components/marketing/feature-sections";
import { Hero } from "@/components/marketing/hero";
import { Pricing } from "@/components/marketing/pricing";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Testimonial } from "@/components/marketing/testimonial";
import { TrustStrip } from "@/components/marketing/trust-strip";

export default async function LandingPage() {
  // Oturum açmış kullanıcının tanıtım sayfasında işi yok.
  const session = await getSession();
  if (session) redirect("/panel");

  return (
    // mk-scope: tanıtım sayfası sabit açık paletle çalışır, koyu tema tercihi
    // burada uygulanmaz (bkz. globals.css → "Tanıtım sayfası").
    <div className="mk-scope min-h-svh">
      <SiteHeader />
      <main>
        <Hero />
        <TrustStrip />
        <FeatureCards />
        <FeatureSections />
        <Testimonial />
        <Bento />
        <Pricing />
        <CtaBand />
      </main>
      <SiteFooter />
    </div>
  );
}
