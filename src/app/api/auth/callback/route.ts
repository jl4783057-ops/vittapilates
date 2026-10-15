import { NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

/**
 * Endpoint de troca de token/code do Supabase Auth (PKCE ou OTP).
 * Redireciona para o destino seguro (/definir-senha ou /redefinir-senha) com cookies de sessão estabelecidos.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") || "/definir-senha";

  // Previne open-redirect: o destino deve ser relativo
  const safeNext = next.startsWith("/") ? next : "/definir-senha";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(
      new URL(`${safeNext}?error=auth_not_configured`, origin)
    );
  }

  // Resposta inicial de redirecionamento para o destino final
  let response = NextResponse.redirect(new URL(safeNext, origin));

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get("cookie") || "";
        return cookieHeader
          .split(";")
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => {
            const [name, ...rest] = c.split("=");
            return { name, value: rest.join("=") };
          });
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // 1. Fluxo PKCE (código auth)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
    return NextResponse.redirect(
      new URL(`${safeNext}?error=invalid_token`, origin)
    );
  }

  // 2. Fluxo OTP / token_hash (links de e-mail de invite / recovery)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      return response;
    }
    return NextResponse.redirect(
      new URL(`${safeNext}?error=expired_token`, origin)
    );
  }

  // Se nenhum token foi fornecido
  return NextResponse.redirect(
    new URL(`${safeNext}?error=missing_token`, origin)
  );
}
