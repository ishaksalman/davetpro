import { useEffect, useState } from "react";
import { BackHandler, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { fontFamily } from "~/design/typography";
import { BrandLogo } from "~/ui/Brand";
import { Text } from "~/ui/Text";
import { markOnboardingSeen } from "~/lib/onboarding";
import { Hero } from "~/features/onboarding/heroes";
import { DarkScene, O, PillButton, SlideText, StoryHeader, white } from "~/features/onboarding/kit";

type Slide = {
  hero: "conflict" | "cash" | "profit";
  glow: [string, string];
  eyebrow: string; title: string; body: string;
};

/** Metinler `docs/marka-brief.md` ile uyumlu: yalnızca üründe gerçekten olan şeyler anlatılır. */
const SLIDES: Slide[] = [
  { hero: "conflict", glow: [O.blue, O.cyan], eyebrow: "TAKVİM", title: "Çakışan kayıt açılmaz.", body: "Aynı salona aynı saate ikinci kayıt girilemez. Uyarı değil, kesin engel." },
  { hero: "cash", glow: [O.mint, O.blue], eyebrow: "KASA", title: "Kasa her zaman tutar.", body: "Tahsilat ve gider kayıtları silinmiyor. İptal edilirse gerekçesiyle iz bırakıyor." },
  { hero: "profit", glow: [O.cyan, O.violet], eyebrow: "KÂRLILIK", title: "Hangi iş kazandırdı, görünür.", body: "Kâr ile nakit akışı ayrı okunur. Her işin payı tek tek ortada." },
];

/** İlk açılış: hoş geldin + üç değer slaytı (Figma "Onboarding 2026" 01–04). */
export default function IntroScreen() {
  const [step, setStep] = useState(0); // 0 = hoş geldin, 1..3 = slayt
  const finish = async (to: "/giris" | "/kayit") => {
    await markOnboardingSeen();
    if (to === "/giris") router.replace(to); else router.push(to);
  };

  // Android geri tuşu: slaytlarda bir önceki adıma döner (hoş geldin ekranında sistem davranışı).
  useEffect(() => {
    if (step === 0) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { setStep((n) => Math.max(0, n - 1)); return true; });
    return () => sub.remove();
  }, [step]);

  if (step === 0) {
    return (
      <DarkScene
        glows={[{ color: O.blue, size: 560, x: -170, y: -190, opacity: 0.55 }, { color: O.mint, size: 380, x: 130, y: 90, opacity: 0.28 }]}
        footer={
          <View style={{ gap: 4 }}>
            <PillButton label="Başla" icon="chevron-right" onPress={() => setStep(1)} />
            <PillButton label="Hesabım var, giriş yap" ghost onPress={() => void finish("/giris")} />
          </View>
        }
      >
        <StatusBar style="light" />
        <View style={{ height: 24 }} />
        <Hero kind="welcome" />
        <View style={{ flex: 1, minHeight: 16 }} />
        <View style={{ gap: 12 }}>
          <BrandLogo onDark height={34} />
          <Text accessibilityRole="header" style={{ color: O.white, fontFamily: fontFamily.bold, fontSize: 38, lineHeight: 43, letterSpacing: -1.1 }}>
            Salonunun takvimi ve kasası cebinde.
          </Text>
          <Text variant="body" style={{ color: white(0.68) }}>Rezervasyon, tahsilat ve ekip tek yerde. Web panelinle anlık eşit.</Text>
        </View>
      </DarkScene>
    );
  }

  const s = SLIDES[step - 1];
  const last = step === SLIDES.length;
  return (
    <DarkScene
      glows={[{ color: s.glow[0], size: 520, x: -130, y: -170, opacity: 0.5 }, { color: s.glow[1], size: 340, x: 160, y: 280, opacity: 0.22 }]}
      header={<StoryHeader step={step} total={SLIDES.length} onSkip={() => void finish("/giris")} onBack={() => setStep(step - 1)} />}
      footer={<PillButton label={last ? "Hesap oluştur" : "Devam"} icon="chevron-right" onPress={() => (last ? void finish("/kayit") : setStep(step + 1))} />}
    >
      <StatusBar style="light" />
      <View style={{ height: 20 }} />
      <Hero kind={s.hero} />
      <View style={{ flex: 1, minHeight: 16 }} />
      <SlideText eyebrow={s.eyebrow} title={s.title} body={s.body} />
      <View style={{ height: 8 }} />
    </DarkScene>
  );
}
