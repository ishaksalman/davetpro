import { handleAuthUrl } from "~/lib/auth/links";

const mockAuth = { verifyOtp: jest.fn(), exchangeCodeForSession: jest.fn(), setSession: jest.fn() };
jest.mock("~/lib/supabase", () => ({ supabase: { auth: { verifyOtp: (...a: unknown[]) => mockAuth.verifyOtp(...a), exchangeCodeForSession: (...a: unknown[]) => mockAuth.exchangeCodeForSession(...a), setSession: (...a: unknown[]) => mockAuth.setSession(...a) } } }));

beforeEach(() => { jest.resetAllMocks(); mockAuth.verifyOtp.mockResolvedValue({ error: null }); mockAuth.exchangeCodeForSession.mockResolvedValue({ error: null }); mockAuth.setSession.mockResolvedValue({ error: null }); });

describe("e-posta bağlantıları (web mockAuth/callback ile aynı üç biçim)", () => {
  test("token_hash + type=recovery → verifyOtp, yeni şifre gerekir", async () => {
    const r = await handleAuthUrl("https://davetpro.example/mockAuth/callback?token_hash=abc&type=recovery&next=/sifre-yenile");
    expect(mockAuth.verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "abc" });
    expect(r).toEqual({ handled: true, ok: true, type: "recovery", needsPassword: true });
  });
  test("davet bağlantısı da şifre belirletir", async () => {
    const r = await handleAuthUrl("davetpro://mockAuth/callback?token_hash=abc&type=invite");
    expect(r).toMatchObject({ handled: true, ok: true, needsPassword: true });
  });
  test("signup doğrulaması şifre istemez", async () => {
    const r = await handleAuthUrl("davetpro://mockAuth/callback?token_hash=abc&type=signup");
    expect(r).toMatchObject({ ok: true, needsPassword: false });
  });
  test("code → exchangeCodeForSession", async () => {
    await handleAuthUrl("davetpro://mockAuth/callback?code=xyz");
    expect(mockAuth.exchangeCodeForSession).toHaveBeenCalledWith("xyz");
  });
  test("örtük akış: #access_token&refresh_token → setSession", async () => {
    const r = await handleAuthUrl("davetpro://mockAuth/callback#access_token=A&refresh_token=R&type=recovery");
    expect(mockAuth.setSession).toHaveBeenCalledWith({ access_token: "A", refresh_token: "R" });
    expect(r).toMatchObject({ ok: true, needsPassword: true });
  });
  test("bilinmeyen tür verifyOtp'a gitmez", async () => {
    const r = await handleAuthUrl("davetpro://mockAuth/callback?token_hash=abc&type=evil");
    expect(mockAuth.verifyOtp).not.toHaveBeenCalled();
    expect(r).toEqual({ handled: false });
  });
  test("hata bağlantısı Türkçe mesaj verir; alakasız URL yok sayılır", async () => {
    expect(await handleAuthUrl("davetpro://mockAuth/callback#error_description=expired")).toMatchObject({ handled: true, ok: false });
    expect(await handleAuthUrl("davetpro://rezervasyon/1")).toEqual({ handled: false });
    expect(await handleAuthUrl("not a url")).toEqual({ handled: false });
  });
  test("doğrulama hatası Türkçeye çevrilir", async () => {
    mockAuth.verifyOtp.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const r = await handleAuthUrl("davetpro://mockAuth/callback?token_hash=abc&type=recovery");
    expect(r).toEqual({ handled: true, ok: false, error: "E-posta veya şifre hatalı." });
  });
});
