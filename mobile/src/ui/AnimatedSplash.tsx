import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from "react-native-reanimated";
import Svg, { Defs, G, LinearGradient, Mask, Path, Stop } from "react-native-svg";
import * as SplashScreen from "expo-splash-screen";
import { Glow } from "~/features/onboarding/kit";
import { useWindowDimensions } from "react-native";
import { fontFamily } from "~/design/typography";

const NAVY = "#0B1220";
const MINT = "#16E0B4";
const VB_W = 774, VB_H = 221;

// Kaynak: DavetPro-Logo.svg — parçalar ayrı ayrı canlandırılır.
const MARK_A = "M155.868 112.594C155.868 97.0512 148.339 81.728 128.269 69.2246C107.43 56.2425 73.2928 46.7371 23.3802 46.7371C10.4677 46.7371 0 36.2746 0 23.3685C0 10.4625 10.4677 0 23.3802 0C78.3243 0 122.121 10.3226 153.002 29.5606C184.652 49.2775 202.629 78.567 202.629 112.594C202.629 149.322 182.701 178.942 156.127 197.447C129.762 215.807 90.507 224.749 57.3879 219.523C44.6334 217.51 40.7822 205.258 42.796 192.51C44.8098 179.762 55.2608 172.189 68.0153 174.202C89.9785 176.326 112.542 170.836 129.395 159.1C146.039 147.51 155.868 131.1 155.868 112.594Z";
const MARK_B = "M0 148.001V23.3685C0 10.4625 10.4677 0 23.3802 0C36.2928 0 46.7605 10.4625 46.7605 23.3685V148.001C46.7605 160.827 50.9699 166.676 54.6093 169.465C58.6997 172.599 64.7745 174.91 79.3511 174.91C93.1141 174.91 103.833 179.582 105.956 192.312C108.078 205.042 99.4743 217.083 86.7377 219.205C65.3212 222.772 43.3231 219.709 26.1589 206.556C8.54354 193.058 0 171.998 0 148.001Z";
const DOT = "M774 146.483C774 149.621 772.873 152.316 770.619 154.569C768.365 156.822 765.669 157.948 762.529 157.948C759.39 157.948 756.693 156.822 754.439 154.569C752.186 152.316 751.059 149.621 751.059 146.483C751.059 143.345 752.186 140.65 754.439 138.397C756.693 136.144 759.39 135.018 762.529 135.018C765.669 135.018 768.365 136.144 770.619 138.397C772.873 140.65 774 143.345 774 146.483Z";
/** Soldan sağa: D a v e t P r o */
const LETTERS = [
  "M234.631 71.7793H268.44C280.031 71.7793 289.771 75.8424 297.66 83.9685C305.549 92.0946 309.493 102.111 309.493 114.019C309.493 126.007 305.549 136.064 297.66 144.19C289.852 152.236 280.112 156.259 268.44 156.259H234.631V71.7793ZM253.95 137.673H268.44C275.121 137.673 280.514 135.541 284.62 131.277C288.805 127.013 290.898 121.26 290.898 114.019C290.898 106.778 288.805 101.066 284.62 96.8818C280.514 92.5371 275.121 90.3648 268.44 90.3648H253.95V137.673Z",
  "M363.582 101.588V95.9162H381.694V156.259H363.582V150.587C359.396 155.494 353.399 157.948 345.591 157.948C337.621 157.948 330.819 154.891 325.185 148.776C319.55 142.662 316.732 135.099 316.732 126.087C316.732 117.157 319.55 109.634 325.185 103.519C330.9 97.3241 337.702 94.2266 345.591 94.2266C353.399 94.2266 359.396 96.6805 363.582 101.588ZM334.844 126.087C334.844 130.593 336.172 134.173 338.829 136.828C341.485 139.483 344.947 140.811 349.213 140.811C353.479 140.811 356.941 139.483 359.597 136.828C362.253 134.173 363.582 130.593 363.582 126.087C363.582 121.582 362.253 118.002 359.597 115.346C356.941 112.691 353.479 111.364 349.213 111.364C344.947 111.364 341.485 112.691 338.829 115.346C336.172 118.002 334.844 121.582 334.844 126.087Z",
  "M420.941 134.173L433.499 95.916H453.542L431.205 156.259H410.678L388.34 95.916H408.384L420.941 134.173Z",
  "M516.876 133.329H474.011C476.023 138.961 480.853 141.777 488.5 141.777C493.411 141.777 497.275 140.248 500.092 137.19L514.582 145.518C508.705 153.805 499.931 157.948 488.259 157.948C478.197 157.948 470.067 154.931 463.868 148.897C457.831 142.863 454.812 135.26 454.812 126.087C454.812 117.076 457.791 109.513 463.748 103.399C469.785 97.2839 477.513 94.2266 486.931 94.2266C495.705 94.2266 502.99 97.2839 508.786 103.399C514.662 109.352 517.6 116.915 517.6 126.087C517.6 128.662 517.359 131.076 516.876 133.329ZM473.649 119.812H499.609C497.838 113.456 493.572 110.278 486.81 110.278C479.807 110.278 475.42 113.456 473.649 119.812Z",
  "M561.482 95.9159V113.295H549.045V134.656C549.045 136.989 549.971 138.518 551.822 139.242C553.673 139.886 556.893 140.087 561.482 139.845V156.259C550.051 157.465 542.082 156.379 537.574 153C533.147 149.54 530.933 143.426 530.933 134.656V113.295H521.273V95.9159H530.933V84.4509L549.045 79.02V95.9159H561.482Z",
  "M573.52 71.7793H605.517C613.889 71.7793 620.892 74.5953 626.527 80.2273C632.242 85.9397 635.1 92.7785 635.1 100.744C635.1 108.709 632.242 115.548 626.527 121.26C620.892 126.892 613.889 129.708 605.517 129.708H592.839V156.259H573.52V71.7793ZM592.839 111.605H605.517C608.495 111.605 610.951 110.559 612.883 108.468C614.814 106.376 615.78 103.801 615.78 100.744C615.78 97.6864 614.814 95.1118 612.883 93.0199C610.951 90.928 608.495 89.8821 605.517 89.8821H592.839V111.605Z",
  "M661.069 95.9163V106.657C662.196 102.876 664.41 99.9392 667.71 97.8473C671.091 95.7554 674.914 94.7095 679.181 94.7095V115.226C674.673 114.502 670.527 115.266 666.744 117.519C662.961 119.691 661.069 123.513 661.069 128.984V156.259H642.957V95.9163H661.069Z",
  "M737.557 148.776C731.439 154.891 723.873 157.948 714.857 157.948C705.841 157.948 698.275 154.891 692.157 148.776C685.959 142.581 682.859 135.018 682.859 126.087C682.859 117.237 685.959 109.714 692.157 103.519C698.355 97.3241 705.922 94.2266 714.857 94.2266C723.792 94.2266 731.359 97.3241 737.557 103.519C743.755 109.714 746.855 117.237 746.855 126.087C746.855 135.018 743.755 142.581 737.557 148.776ZM700.971 126.087C700.971 130.271 702.299 133.691 704.956 136.346C707.612 139.001 710.913 140.328 714.857 140.328C718.801 140.328 722.102 139.001 724.758 136.346C727.415 133.691 728.743 130.271 728.743 126.087C728.743 121.904 727.415 118.484 724.758 115.829C722.102 113.174 718.801 111.847 714.857 111.847C710.913 111.847 707.612 113.174 704.956 115.829C702.299 118.484 700.971 121.904 700.971 126.087Z"
];

// "D" işaretinin kalem izi (orta çizgi): önce sol dikme + alt kıvrım, sonra kıvrık gövde. Kalın çizgi maske olarak
// gradyanlı şekli açığa çıkarır; çizim `strokeDashoffset` ile ilerler.
type Cubic = [number, number, number, number, number, number, number, number];
const PEN: Cubic[][] = [
  // dikme: yukarıdan aşağı (doğru parçası kübik olarak yazıldı) + alt ayak
  [[23.4, 23.4, 23.4, 66.9, 23.4, 105.5, 23.4, 148], [23.4, 148, 23.4, 172, 36, 188, 56, 196], [56, 196, 70, 201.5, 84, 204.5, 96.3, 205.7]],
  // gövde: üstten sağa, aşağı, alta kıvrılıp biter
  [[23.4, 23.4, 75.8, 23.4, 114.8, 33.3, 140.6, 49.4], [140.6, 49.4, 166.5, 65.5, 179.25, 87.8, 179.25, 112.6], [179.25, 112.6, 179.25, 140.2, 164.4, 163.2, 142.8, 178.3], [142.8, 178.3, 121.2, 193.3, 90.2, 200.5, 62.7, 196.9]],
];
const fmt = (n: number) => n.toFixed(1);
const penPath = (sub: Cubic[]) => `M ${fmt(sub[0][0])} ${fmt(sub[0][1])} ` + sub.map((c) => `C ${c.slice(2).map(fmt).join(" ")}`).join(" ");
function cubicLength(c: Cubic) {
  let len = 0, px = c[0], py = c[1];
  for (let i = 1; i <= 60; i++) {
    const t = i / 60, u = 1 - t;
    const x = u * u * u * c[0] + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6];
    const y = u * u * u * c[1] + 3 * u * u * t * c[3] + 3 * u * t * t * c[5] + t * t * t * c[7];
    len += Math.hypot(x - px, y - py); px = x; py = y;
  }
  return len;
}
const STEM_D = penPath(PEN[0]);
const BODY_D = penPath(PEN[1]);
const STEM_LEN = PEN[0].reduce((a, c) => a + cubicLength(c), 0);
const BODY_LEN = PEN[1].reduce((a, c) => a + cubicLength(c), 0);
/** Çizim ilerlemesinin dikmeye ayrılan payı: uzunluğa orantılı, dikme bitince gövde başlar (çizgi deseni her alt yolda yeniden başladığı için iki ayrı yol). */
const STEM_SHARE = STEM_LEN / (STEM_LEN + BODY_LEN);
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Gradyanlı "D" işareti, kalemle çiziliyormuş gibi açılır (`draw`: 0 → 1): önce dikme, sonra kıvrık gövde. */
function PenMark({ w, h, draw }: { w: number; h: number; draw: { value: number } }) {
  const stem = useAnimatedProps(() => ({ strokeDashoffset: STEM_LEN * (1 - Math.min(1, draw.value / STEM_SHARE)) }));
  const body = useAnimatedProps(() => ({ strokeDashoffset: BODY_LEN * (1 - Math.max(0, Math.min(1, (draw.value - STEM_SHARE) / (1 - STEM_SHARE)))) }));
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${VB_W} ${VB_H}`} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="spA" x1="-36.1331" y1="224.48" x2="190.471" y2="-2.23779" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#1A5CFF" /><Stop offset="0.55" stopColor="#0FBFD8" /><Stop offset="1" stopColor={MINT} />
        </LinearGradient>
        <LinearGradient id="spB" x1="162.245" y1="12.0383" x2="6.47288" y2="210.393" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={MINT} /><Stop offset="1" stopColor="#1A5CFF" />
        </LinearGradient>
        <Mask id="pen" maskUnits="userSpaceOnUse" x="-10" y="-10" width="240" height="250">
          <AnimatedPath d={STEM_D} stroke="#FFFFFF" strokeWidth={66} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={[STEM_LEN, STEM_LEN]} animatedProps={stem} />
          <AnimatedPath d={BODY_D} stroke="#FFFFFF" strokeWidth={66} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={[BODY_LEN, BODY_LEN]} animatedProps={body} />
        </Mask>
      </Defs>
      <G mask="url(#pen)">
        <Path d={MARK_B} fill="url(#spB)" />
        <Path d={MARK_A} fill="url(#spA)" />
      </G>
    </Svg>
  );
}

/** Giriş animasyonunun en kısa süresi (ms); uygulama hazırsa bundan sonra perde kalkar. */
const INTRO_MS = 3000;
const EXIT_MS = 480;

function Part({ d, fill, w, h, gradient }: { d: string; fill: string; w: number; h: number; gradient?: "A" | "B" }) {
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${VB_W} ${VB_H}`} style={StyleSheet.absoluteFill}>
      {gradient ? (
        <Defs>
          {gradient === "A" ? (
            <LinearGradient id="spA" x1="-36.1331" y1="224.48" x2="190.471" y2="-2.23779" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#1A5CFF" /><Stop offset="0.55" stopColor="#0FBFD8" /><Stop offset="1" stopColor={MINT} />
            </LinearGradient>
          ) : (
            <LinearGradient id="spB" x1="162.245" y1="12.0383" x2="6.47288" y2="210.393" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={MINT} /><Stop offset="1" stopColor="#1A5CFF" />
            </LinearGradient>
          )}
        </Defs>
      ) : null}
      <Path d={d} fill={gradient ? `url(#sp${gradient})` : fill} />
    </Svg>
  );
}

function Letter({ d, w, h, index, play }: { d: string; w: number; h: number; index: number; play: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = play ? withDelay(1450 + index * 75, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })) : 1;
  }, [play, index, t]);
  const style = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * 18 }] }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]}><Part d={d} fill="#FFFFFF" w={w} h={h} /></Animated.View>;
}

/**
 * Açılış ekranı (marka anı): koyu zemin, nefes alan ışıklar, işaretin kalemle çizilir gibi oluşması, harflerin tek tek yükselmesi
 * ve sondaki yeşil noktanın yaylanarak düşmesi + dalga. Uygulama hazır olunca (`ready`) ve giriş animasyonu bitince
 * perde yumuşakça kalkar. Hareketi azalt açıksa animasyon yok, kısa bir solma var.
 */
export function AnimatedSplash({ ready }: { ready: boolean }) {
  const reduce = useReducedMotion();
  const { width: sw } = useWindowDimensions();
  const [introDone, setIntroDone] = useState(false);
  const [gone, setGone] = useState(false);

  const w = Math.min(300, sw * 0.72);
  const h = (w * VB_H) / VB_W;
  const k = w / VB_W;
  const play = !reduce;

  const glow = useSharedValue(0);
  const breathe = useSharedValue(0);
  const draw = useSharedValue(0);
  const dot = useSharedValue(0);
  const ripple = useSharedValue(0);
  const tagline = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    if (play) {
      glow.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) });
      breathe.value = withRepeat(withSequence(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) })), -1);
      draw.value = withDelay(250, withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.cubic) }));
      dot.value = withDelay(2100, withSpring(1, { damping: 7, stiffness: 160, mass: 0.7 }));
      ripple.value = withDelay(2150, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }));
      tagline.value = withDelay(2300, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    } else {
      glow.value = 1; draw.value = 1; dot.value = 1; tagline.value = 1;
    }
    const t = setTimeout(() => setIntroDone(true), play ? INTRO_MS : 600);
    return () => clearTimeout(t);
  }, [play, glow, breathe, draw, dot, ripple, tagline]);

  useEffect(() => {
    if (!(introDone && ready)) return;
    exit.value = withTiming(1, { duration: EXIT_MS, easing: Easing.inOut(Easing.cubic) });
    const t = setTimeout(() => setGone(true), EXIT_MS + 40);
    return () => clearTimeout(t);
  }, [introDone, ready, exit]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + exit.value * 0.06 }] }));
  const glowStyleA = useAnimatedStyle(() => ({ opacity: glow.value * (0.85 + breathe.value * 0.15), transform: [{ scale: 1 + breathe.value * 0.08 }] }));
  const glowStyleB = useAnimatedStyle(() => ({ opacity: glow.value * (0.7 + (1 - breathe.value) * 0.3), transform: [{ scale: 1.05 - breathe.value * 0.07 }] }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, dot.value * 3), transform: [{ translateY: (1 - dot.value) * -60 * k * 2 }, { scale: 0.3 + dot.value * 0.7 }] }));
  const rippleStyle = useAnimatedStyle(() => ({ opacity: ripple.value === 0 ? 0 : (1 - ripple.value) * 0.7, transform: [{ scale: 0.4 + ripple.value * 4.2 }] }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: tagline.value * 0.7, transform: [{ translateY: (1 - tagline.value) * 8 }] }));

  if (gone) return null;

  // Nokta (viewBox 762.5, 146.5) ve işaret merkezi (101, 110) piksele çevrilir.
  const dotX = 762.5 * k, dotY = 146.5 * k;
  const R = 12;

  return (
    <Animated.View
      pointerEvents={introDone && ready ? "none" : "auto"}
      style={[StyleSheet.absoluteFill, { backgroundColor: NAVY, alignItems: "center", justifyContent: "center" }, rootStyle]}
      onLayout={() => { SplashScreen.hideAsync().catch(() => {}); }}
      accessibilityLabel="DavetPro yükleniyor"
      accessible
    >
      <Animated.View style={[StyleSheet.absoluteFill, glowStyleA]} pointerEvents="none">
        <Glow color="#1A5CFF" size={620} x={-230} y={-180} opacity={0.55} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, glowStyleB]} pointerEvents="none">
        <Glow color={MINT} size={460} x={sw - 260} y={420} opacity={0.3} />
      </Animated.View>

      <Animated.View style={logoStyle}>
        <View style={{ width: w, height: h }}>
          <PenMark w={w} h={h} draw={draw} />
          {LETTERS.map((d, i) => <Letter key={i} d={d} w={w} h={h} index={i} play={play} />)}
          <Animated.View pointerEvents="none" style={[{ position: "absolute", left: dotX - R, top: dotY - R, width: R * 2, height: R * 2, borderRadius: R, borderWidth: 2, borderColor: MINT }, rippleStyle]} />
          <Animated.View style={[StyleSheet.absoluteFill, dotStyle]}>
            <Part d={DOT} fill={MINT} w={w} h={h} />
          </Animated.View>
        </View>
      </Animated.View>

      <Animated.Text style={[{ position: "absolute", bottom: 72, color: "#FFFFFF", fontFamily: fontFamily.medium, fontSize: 14, letterSpacing: 0.2 }, taglineStyle]}>
        Takviminiz ve kasanız cebinizde.
      </Animated.Text>
    </Animated.View>
  );
}
