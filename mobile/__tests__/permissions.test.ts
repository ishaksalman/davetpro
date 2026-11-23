import { canSeeFinance, isAdmin } from "~/lib/permissions";

describe("yetki (RLS can_see_finance ile aynı kural)", () => {
  test("owner/manager her zaman finansı görür", () => {
    expect(canSeeFinance({ role: "owner", can_view_finance: false })).toBe(true);
    expect(canSeeFinance({ role: "manager", can_view_finance: false })).toBe(true);
  });
  test("staff yalnızca bayrak açıksa", () => {
    expect(canSeeFinance({ role: "staff", can_view_finance: false })).toBe(false);
    expect(canSeeFinance({ role: "staff", can_view_finance: true })).toBe(true);
  });
  test("yönetici = owner | manager", () => {
    expect(isAdmin({ role: "owner" })).toBe(true);
    expect(isAdmin({ role: "manager" })).toBe(true);
    expect(isAdmin({ role: "staff" })).toBe(false);
  });
});
