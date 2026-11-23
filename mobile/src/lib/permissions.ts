import type { Profile } from "@/lib/database.types";

/**
 * Finansal verileri görebilir mi? RLS'teki can_see_finance() ile AYNI kural
 * (web: src/lib/auth.ts). Bu yalnızca arayüzü uyarlar; veriyi RLS verir/vermez —
 * ekranı gizlemek tek başına finans güvenliği DEĞİLDİR.
 */
export function canSeeFinance(profile: Pick<Profile, "role" | "can_view_finance">): boolean {
  return profile.role !== "staff" || profile.can_view_finance;
}

export function isAdmin(profile: Pick<Profile, "role">): boolean {
  return profile.role === "owner" || profile.role === "manager";
}
