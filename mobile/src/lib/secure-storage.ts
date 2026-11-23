import * as SecureStore from "expo-secure-store";

/**
 * Supabase oturum depolaması: iOS Keychain / Android Keystore (expo-secure-store).
 *
 * Oturum JSON'u çoğu zaman SecureStore'un ~2 KB sınırını aşar; bu yüzden
 * değer parçalara bölünerek saklanır. AsyncStorage KULLANILMAZ: token şifresiz
 * düz dosyada dururdu.
 */
const CHUNK = 1800;
const countKey = (k: string) => `${k}.n`;
const partKey = (k: string, i: number) => `${k}.${i}`;

async function removeAll(key: string): Promise<void> {
  const n = Number((await SecureStore.getItemAsync(countKey(key))) ?? 0);
  for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(partKey(key, i));
  await SecureStore.deleteItemAsync(countKey(key));
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const n = Number((await SecureStore.getItemAsync(countKey(key))) ?? 0);
    if (!n) return null;
    const parts: string[] = [];
    for (let i = 0; i < n; i++) {
      const p = await SecureStore.getItemAsync(partKey(key, i));
      if (p === null) return null; // yarım yazılmış kayıt: oturum yok say
      parts.push(p);
    }
    return parts.join("");
  },
  async setItem(key: string, value: string): Promise<void> {
    await removeAll(key);
    const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, "g")) ?? [];
    for (let i = 0; i < parts.length; i++) await SecureStore.setItemAsync(partKey(key, i), parts[i]);
    await SecureStore.setItemAsync(countKey(key), String(parts.length));
  },
  async removeItem(key: string): Promise<void> {
    await removeAll(key);
  },
};
