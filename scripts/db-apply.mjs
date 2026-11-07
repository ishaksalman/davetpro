// Canlı veritabanına bir migration uygular (Supabase Management API).
//
//   npm run db:apply -- 0049
//
// .env.local içinde SUPABASE_ACCESS_TOKEN gerekir: supabase.com › Account ›
// Access Tokens. Proje kodu NEXT_PUBLIC_SUPABASE_URL'den okunur.
// Dosyanın tamamı tek istekte gider; Supabase bunu tek transaction'da çalıştırır.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

process.loadEnvFile(".env.local");

const prefix = process.argv[2];
const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ref = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];

if (!prefix) fail("Kullanım: npm run db:apply -- <numara>  (ör. 0049)");
if (!token) fail(".env.local içinde SUPABASE_ACCESS_TOKEN yok.");
if (!ref) fail("NEXT_PUBLIC_SUPABASE_URL'den proje kodu okunamadı.");

const dir = "supabase/migrations";
const matches = readdirSync(dir).filter((f) => f.startsWith(`${prefix}_`));
if (matches.length !== 1) fail(`${prefix} için ${matches.length} dosya bulundu.`);

const file = matches[0];
const query = readFileSync(join(dir, file), "utf8");

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});

if (!res.ok) fail(`${file} uygulanamadı (${res.status}): ${await res.text()}`);
console.log(`${file} uygulandı (${ref}).`);

function fail(message) {
  console.error(message);
  process.exit(1);
}
