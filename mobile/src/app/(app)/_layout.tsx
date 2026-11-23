import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="rezervasyon/[id]" />
      <Stack.Screen name="talepler/index" />
      <Stack.Screen name="talepler/[id]" />
      <Stack.Screen name="talepler/form" options={{ presentation: "modal" }} />
      <Stack.Screen name="tanimlar/paketler" />
      <Stack.Screen name="tanimlar/salonlar" />
      <Stack.Screen name="tanimlar/ekipler" />
      <Stack.Screen name="ayarlar/index" />
      <Stack.Screen name="ayarlar/isletme" />
      <Stack.Screen name="ayarlar/kullanicilar" />
      <Stack.Screen name="ayarlar/kategoriler" />
      <Stack.Screen name="hesap" />
      <Stack.Screen name="finans-raporu" />
      <Stack.Screen name="gelirler" />
      <Stack.Screen name="giderler" />
      <Stack.Screen name="musteriler/index" />
      <Stack.Screen name="musteriler/[id]" />
      <Stack.Screen name="rezervasyon/form" options={{ presentation: "modal" }} />
    </Stack>
  );
}
