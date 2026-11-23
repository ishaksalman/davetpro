import { Redirect } from "expo-router";
import { useSessionContext } from "~/lib/auth/session";
import { useOnboardingSeen } from "~/lib/onboarding";

/**
 * Kök rota: oturum durumuna göre doğru ekrana yönlendirir. "/" korumalı
 * gruplardan birine düşerse eşleşmeyen rota görünürdü; bu rota her zaman açık.
 */
export default function Index() {
  const { state, passwordSetupPending } = useSessionContext();
  const seenIntro = useOnboardingSeen();
  if (state.status === "loading") return null;
  if (state.status === "signedOut") {
    if (seenIntro === null) return null;
    return <Redirect href={seenIntro ? "/giris" : "/tanitim"} />;
  }
  if (passwordSetupPending) return <Redirect href="/sifre-yenile" />;
  if (state.status === "noProfile") return <Redirect href="/kurulum" />;
  if (state.status === "error") return <Redirect href="/hata" />;
  const expired = state.session.subscription?.state === "sona_erdi" && !state.session.isPlatformAdmin;
  return <Redirect href={expired ? "/abonelik" : "/anasayfa"} />;
}
