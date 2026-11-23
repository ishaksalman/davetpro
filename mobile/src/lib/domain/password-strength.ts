/**
 * Şifre gücü göstergesi (onboarding hesap adımı). Yalnızca yönlendirme içindir;
 * zorunlu kural web ile aynı: en az 8 karakter (`newPasswordSchema`).
 */
export type PasswordStrength = { level: 0 | 1 | 2 | 3 | 4; label: string };

export function passwordStrength(pw: string): PasswordStrength {
  if (!pw) return { level: 0, label: "En az 8 karakter olmalı" };
  if (pw.length < 8) return { level: 1, label: "Zayıf — en az 8 karakter" };
  const hasDigit = /\d/.test(pw);
  const hasMixed = /[a-zçğıöşü]/.test(pw) && /[A-ZÇĞİÖŞÜ]/.test(pw);
  const hasSymbol = /[^\p{L}\d]/u.test(pw);
  if (!hasDigit) return { level: 2, label: "Orta — bir rakam daha ekle" };
  if (hasMixed && hasSymbol && pw.length >= 10) return { level: 4, label: "Güçlü" };
  return { level: 3, label: "İyi" };
}
