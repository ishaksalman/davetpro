import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTACT_EMAIL, CONTACT_WHATSAPP } from "@/lib/contact";

/**
 * Günlük erişim süresi hatırlatması (e-posta). Uygulama içinde uyarı gösterilmez
 * (Apple 3.1.1); bilgilendirme yalnızca uygulama dışında yapılır.
 *
 * Tekilleştirme tablosu YOK: her gün bir kez çalışır ve yalnızca kalan günü
 * tam 14 / 7 / 1 olan (ve bitiş gününden sonraki 1. günü) işletmelere yazar.
 * Aynı gün iki kez tetiklenirse aynı e-posta iki kez gider; cron günde bir.
 *
 * Gerekli ortam değişkenleri: CRON_SECRET, RESEND_API_KEY, MAIL_FROM,
 * SUPABASE_SERVICE_ROLE_KEY. Vercel Cron `Authorization: Bearer $CRON_SECRET` yollar.
 */
const REMIND_DAYS = [14, 7, 1];
const EXPIRED_DAYS_AGO = 1;

const DAY = 86_400_000;
const fmt = (d: Date) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });

function istanbulDay(d: Date) {
  return Math.floor((d.getTime() + 3 * 3_600_000) / DAY);
}

function message(name: string, daysLeft: number, until: Date) {
  const expired = daysLeft < 0;
  const subject = expired
    ? "DavetPro erişim süreniz sona erdi"
    : daysLeft === 1
      ? "DavetPro erişim süreniz yarın bitiyor"
      : `DavetPro erişim süreniz ${daysLeft} gün sonra bitiyor`;
  const body = expired
    ? `${name} için DavetPro erişim süresi ${fmt(until)} tarihinde sona erdi. Verileriniz saklanıyor; erişimi sürdürmek için bizimle iletişime geçin.`
    : `${name} için DavetPro erişim süresi ${fmt(until)} tarihinde sona erecek. Kesinti yaşamamak için süreyi önceden uzatabilirsiniz.`;
  const html = `<p>Merhaba,</p><p>${body}</p><p>Hesap durumunuzu <a href="https://www.davetpro.com/abonelik">davetpro.com</a> web panelinden görüntüleyebilir, ödeme ve uzatma için bize WhatsApp'tan (${CONTACT_WHATSAPP}) ya da <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> adresinden ulaşabilirsiniz.</p><p>DavetPro</p>`;
  return { subject, html };
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!resendKey || !from) return NextResponse.json({ ok: false, error: "RESEND_API_KEY/MAIL_FROM yok" }, { status: 500 });

  const admin = createAdminClient();
  const { data: subs, error } = await admin
    .from("subscriptions")
    .select("business_id, access_until, businesses(name)");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const today = istanbulDay(new Date());
  let sent = 0;
  const failed: string[] = [];

  for (const s of subs ?? []) {
    const until = new Date(s.access_until as string);
    const daysLeft = istanbulDay(until) - today;
    if (!REMIND_DAYS.includes(daysLeft) && daysLeft !== -EXPIRED_DAYS_AGO) continue;

    const { data: owners } = await admin
      .from("profiles")
      .select("id")
      .eq("business_id", s.business_id)
      .eq("role", "owner")
      .eq("is_active", true);
    const biz = s.businesses as unknown as { name: string } | { name: string }[] | null;
    const name = (Array.isArray(biz) ? biz[0]?.name : biz?.name) ?? "İşletmeniz";

    for (const o of owners ?? []) {
      const { data: u } = await admin.auth.admin.getUserById(o.id as string);
      const to = u.user?.email;
      if (!to) continue;
      const { subject, html } = message(name, daysLeft, until);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject, html }),
      });
      if (res.ok) sent++;
      else failed.push(`${s.business_id}:${res.status}`);
    }
  }
  return NextResponse.json({ ok: failed.length === 0, sent, failed });
}
