import { useEffect, useRef } from "react";
import { AppState, View } from "react-native";
import { Stack } from "expo-router";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { ThemeProvider, useTheme } from "~/design/theme";
import { handleAuthUrl } from "~/lib/auth/links";
import { SessionProvider, useSessionContext } from "~/lib/auth/session";
import { AnimatedSplash } from "~/ui/AnimatedSplash";
import { ToastProvider, useToast } from "~/ui/Feedback";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Çevrimdışıyken sorgular beklemeye alınır; bağlantı gelince sürer.
onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false)));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15_000, refetchOnReconnect: true },
    // Yazma işlemleri ASLA otomatik tekrarlanmaz (çift kayıt riski).
    mutations: { retry: false },
  },
});

function AuthLinkListener() {
  const toast = useToast();
  const { setPasswordSetupPending } = useSessionContext();
  const url = Linking.useLinkingURL();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!url || url === last.current) return;
    last.current = url;
    handleAuthUrl(url).then((r) => {
      if (!r.handled) return;
      if (!r.ok) toast({ tone: "danger", message: r.error });
      else if (r.needsPassword) setPasswordSetupPending(true);
    });
  }, [url, toast, setPasswordSetupPending]);
  return null;
}

function Gate() {
  const { colors, dark } = useTheme();
  const { state, passwordSetupPending } = useSessionContext();
  const expired =
    state.status === "ready" && state.session.subscription?.state === "sona_erdi" && !state.session.isPlatformAdmin;
  const ready = state.status === "ready" && !expired && !passwordSetupPending;

  // Yerel açılış ekranı AnimatedSplash çizilince kapanır (onLayout); burada ayrıca yedek olarak oturum çözülünce kapatılır.
  useEffect(() => {
    if (state.status !== "loading") SplashScreen.hideAsync().catch(() => {});
  }, [state.status]);

  // Açılış animasyonu tek örnek olarak kalır (sırası sabit): oturum çözülürken de, sonra da yeniden başlamaz.
  return (
    <>
      {state.status === "loading" ? (
        <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />
      ) : (
        <>
          <StatusBar style={dark ? "light" : "dark"} />
          <AuthLinkListener />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgCanvas } }}>
            <Stack.Protected guard={state.status === "signedOut"}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
            <Stack.Protected guard={state.status !== "signedOut" && passwordSetupPending}>
              <Stack.Screen name="sifre-yenile" />
            </Stack.Protected>
            <Stack.Protected guard={state.status === "noProfile" && !passwordSetupPending}>
              <Stack.Screen name="kurulum" />
            </Stack.Protected>
            <Stack.Protected guard={state.status === "error"}>
              <Stack.Screen name="hata" />
            </Stack.Protected>
            <Stack.Protected guard={expired && !passwordSetupPending}>
              <Stack.Screen name="abonelik" />
            </Stack.Protected>
            <Stack.Protected guard={ready}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Screen name="auth/callback" />
            <Stack.Screen name="index" />
            {__DEV__ ? <Stack.Screen name="onizleme" /> : null}
          </Stack>
        </>
      )}
      <AnimatedSplash ready={state.status !== "loading"} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold });

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => focusManager.setFocused(s === "active"));
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <ToastProvider>
              <Gate />
            </ToastProvider>
          </SessionProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
