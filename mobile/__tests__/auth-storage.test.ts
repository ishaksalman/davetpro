import { secureStorage } from "~/lib/secure-storage";

const mockStore = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: async (k: string) => mockStore.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => { mockStore.set(k, v); },
  deleteItemAsync: async (k: string) => { mockStore.delete(k); },
}));

describe("güvenli oturum depolaması", () => {
  beforeEach(() => mockStore.clear());
  test("2 KB üstü oturum parçalanıp geri birleşir", async () => {
    const big = JSON.stringify({ access_token: "a".repeat(5000), refresh_token: "r".repeat(100) });
    await secureStorage.setItem("sb", big);
    expect([...mockStore.keys()].filter((k) => k.startsWith("sb.")).length).toBeGreaterThan(3);
    expect(Math.max(...[...mockStore.values()].map((v) => v.length))).toBeLessThanOrEqual(1800);
    expect(await secureStorage.getItem("sb")).toBe(big);
  });
  test("üzerine yazma eski parçaları bırakmaz; silme hepsini siler", async () => {
    await secureStorage.setItem("sb", "x".repeat(5000));
    await secureStorage.setItem("sb", "kısa");
    expect(await secureStorage.getItem("sb")).toBe("kısa");
    await secureStorage.removeItem("sb");
    expect(mockStore.size).toBe(0);
    expect(await secureStorage.getItem("sb")).toBeNull();
  });
  test("yarım yazılmış kayıt oturum yok sayılır", async () => {
    await secureStorage.setItem("sb", "y".repeat(4000));
    mockStore.delete("sb.1");
    expect(await secureStorage.getItem("sb")).toBeNull();
  });
});
