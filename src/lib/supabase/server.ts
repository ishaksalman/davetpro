import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Server Component / Server Action istemcisi.
 * Her istekte yeniden oluşturulur — cookie bağlamı isteğe özeldir.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component içinden cookie yazılamaz; oturum tazeleme
          // middleware tarafından yapıldığı için burada yok sayılabilir.
        }
      },
    },
  });
}
