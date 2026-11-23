import { inviteSchema } from "@/lib/team-invites";

describe("kullanıcı daveti (web ile ortak şema)", () => {
  test("geçerli girdi; e-posta kırpılır", () => {
    const r = inviteSchema.safeParse({ email: " a@b.co ", full_name: "Ali Veli", role: "staff", can_view_finance: false });
    expect(r.success && r.data.email).toBe("a@b.co");
  });
  test("owner rolü davet edilemez", () => {
    expect(inviteSchema.safeParse({ email: "a@b.co", full_name: "Ali", role: "owner", can_view_finance: true }).success).toBe(false);
  });
});
