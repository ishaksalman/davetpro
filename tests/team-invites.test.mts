import test from "node:test";
import assert from "node:assert/strict";
import { cancelInvite, inviteMember, pendingInviteIds, type AdminLike } from "../src/lib/team-invites.ts";

type Calls = { invited: string[]; inserted: Record<string, unknown>[]; deleted: string[] };

function fake(opts: {
  inviteError?: string;
  insertError?: string;
  profiles?: Record<string, { id: string; business_id: string }>;
  lastSignIn?: Record<string, string | null>;
}): { admin: AdminLike; calls: Calls } {
  const calls: Calls = { invited: [], inserted: [], deleted: [] };
  const admin: AdminLike = {
    auth: {
      admin: {
        inviteUserByEmail: async (email) => {
          calls.invited.push(email);
          return opts.inviteError
            ? { data: { user: null }, error: { message: opts.inviteError } }
            : { data: { user: { id: "u-new" } }, error: null };
        },
        deleteUser: async (id) => {
          calls.deleted.push(id);
          return { error: null };
        },
        getUserById: async (id) => ({ data: { user: { last_sign_in_at: opts.lastSignIn?.[id] ?? null } }, error: null }),
      },
    },
    from: () => ({
      insert: async (row) => {
        calls.inserted.push(row);
        return { error: opts.insertError ? { message: opts.insertError } : null };
      },
      select: () => ({ eq: (_c, v) => ({ maybeSingle: async () => ({ data: opts.profiles?.[v] ?? null }) }) }),
    }),
  };
  return { admin, calls };
}

const base = { businessId: "b1", businessName: "Gül Salon", appUrl: "https://app.example" };
const good = { email: " ali@firma.com ", full_name: "Ali Veli", role: "staff", can_view_finance: false };

test("geçerli davet: kullanıcı davet edilir ve profil işletmeye bağlanır", async () => {
  const { admin, calls } = fake({});
  const r = await inviteMember({ admin, ...base, input: good });
  assert.deepEqual(r, { ok: true });
  assert.deepEqual(calls.invited, ["ali@firma.com"]);
  assert.deepEqual(calls.inserted[0], { id: "u-new", business_id: "b1", full_name: "Ali Veli", role: "staff", can_view_finance: false });
});

test("rol yalnızca manager|staff: owner davet edilemez (yetki yükseltme)", async () => {
  const { admin, calls } = fake({});
  const r = await inviteMember({ admin, ...base, input: { ...good, role: "owner" } });
  assert.equal(r.ok, false);
  assert.equal(calls.invited.length, 0);
});

test("geçersiz e-posta ve kısa ad Türkçe hata verir, davet gönderilmez", async () => {
  const { admin, calls } = fake({});
  assert.deepEqual(await inviteMember({ admin, ...base, input: { ...good, email: "x" } }), { ok: false, error: "Geçerli bir e-posta adresi girin." });
  assert.deepEqual(await inviteMember({ admin, ...base, input: { ...good, full_name: "A" } }), { ok: false, error: "Ad soyad en az 2 karakter olmalı." });
  assert.equal(calls.invited.length, 0);
});

test("zaten kayıtlı e-posta: ne yapılacağını söyler", async () => {
  const { admin } = fake({ inviteError: "A user has already been registered" });
  const r = await inviteMember({ admin, ...base, input: good });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /Davet bekliyor/);
});

test("profil açılamazsa davet edilen kullanıcı geri silinir", async () => {
  const { admin, calls } = fake({ insertError: "boom" });
  const r = await inviteMember({ admin, ...base, input: good });
  assert.deepEqual(r, { ok: false, error: "boom" });
  assert.deepEqual(calls.deleted, ["u-new"]);
});

test("davet iptali: başka işletmenin kullanıcısı silinemez", async () => {
  const { admin, calls } = fake({ profiles: { x1: { id: "x1", business_id: "OTHER" } } });
  const r = await cancelInvite({ admin, businessId: "b1", callerId: "me", profileId: "x1" });
  assert.deepEqual(r, { ok: false, error: "Kullanıcı bulunamadı." });
  assert.equal(calls.deleted.length, 0);
});

test("davet iptali: kendini silemez; girişi olan silinemez; bekleyen silinir", async () => {
  const profiles = { p1: { id: "p1", business_id: "b1" }, p2: { id: "p2", business_id: "b1" } };
  const { admin, calls } = fake({ profiles, lastSignIn: { p1: "2026-10-01T10:00:00Z", p2: null } });
  assert.deepEqual(await cancelInvite({ admin, businessId: "b1", callerId: "p1", profileId: "p1" }), { ok: false, error: "Kendi hesabınızı silemezsiniz." });
  const girisli = await cancelInvite({ admin, businessId: "b1", callerId: "me", profileId: "p1" });
  assert.equal(girisli.ok, false);
  assert.equal(calls.deleted.length, 0);
  assert.deepEqual(await cancelInvite({ admin, businessId: "b1", callerId: "me", profileId: "p2" }), { ok: true });
  assert.deepEqual(calls.deleted, ["p2"]);
});

test("bekleyen davetler: hiç giriş yapmamış olanlar", async () => {
  const { admin } = fake({ lastSignIn: { a: "2026-01-01T00:00:00Z", b: null } });
  assert.deepEqual(await pendingInviteIds(admin, ["a", "b"]), ["b"]);
});
