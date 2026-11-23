import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors, type Colors } from "./tokens";

export type ThemePreference = "system" | "light" | "dark";
type Theme = { colors: Colors; dark: boolean; preference: ThemePreference; setPreference: (p: ThemePreference) => void };
const ThemeContext = createContext<Theme>({ colors: lightColors, dark: false, preference: "system", setPreference: () => {} });

const STORAGE_KEY = "davetpro.theme";
const isPreference = (v: unknown): v is ThemePreference => v === "system" || v === "light" || v === "dark";

/**
 * Tema: kullanıcı tercihi (Sistem / Açık / Koyu) `Appearance.setColorScheme` ile uygulanır; böylece
 * `useColorScheme` kullanan her yer, klavye ve sistem uyarıları da aynı temayı izler.
 * Tercih cihazda saklanır; Figma'daki açık ve koyu (Color Dark) değişken setleri kullanılır.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => { if (isPreference(v)) setPreferenceState(v); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    Appearance.setColorScheme(preference === "system" ? "unspecified" : preference);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const value = useMemo<Theme>(
    () => ({ dark: scheme === "dark", colors: scheme === "dark" ? darkColors : lightColors, preference, setPreference }),
    [scheme, preference, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
