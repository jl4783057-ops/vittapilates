import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

/**
 * Cria um cliente Supabase para Server Components e Server Actions
 * lendo e sincronizando cookies da requisição com a biblioteca oficial @supabase/ssr.
 */
export async function createClientServer() {
  const cookieStore = await cookies();
  const projectId = supabaseUrl ? new URL(supabaseUrl).hostname.split(".")[0] : "";
  const defaultStorageKey = projectId ? `sb-${projectId}-auth-token` : "";

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const all = cookieStore.getAll();
        if (defaultStorageKey && !all.some((c) => c.name.startsWith(defaultStorageKey))) {
          const mapped = [...all];
          for (const c of all) {
            if (c.name.startsWith("sb-auth-token")) {
              mapped.push({
                name: c.name.replace("sb-auth-token", defaultStorageKey),
                value: c.value,
              });
            }
          }
          return mapped;
        }
        return all;
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // O método `setAll` foi chamado em um Server Component.
          // Isso pode ser ignorado se você tiver middleware/proxy atualizando sessões.
        }
      },
    },
  });
}
