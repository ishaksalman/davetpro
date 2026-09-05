"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/** Tarayıcı tarafı Supabase istemcisi (tekil). */
export function createClient() {
  cached ??= createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  return cached;
}
