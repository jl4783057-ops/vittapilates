import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseAnonServer, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { normalizeEmail, siteUrl } from "@/lib/access";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate Limiting por IP: máx 5 solicitações a cada 10 minutos
  const ipRateLimit = checkRateLimit(`pw-recovery-ip:${ip}`, {
    maxRequests: 5,
    windowSeconds: 600,
    blockDurationSeconds: 1200,
  });

  if (!ipRateLimit.success) {
    return NextResponse.json(
      { error: "Muitas solicitações em sequência. Por favor, aguarde alguns minutos antes de tentar novamente." },
      {
        status: 429,
        headers: { "Retry-After": String(ipRateLimit.retryAfterSeconds ?? 60) },
      }
    );
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json(
      { error: "Serviço de autenticação temporariamente indisponível." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const rawEmail = String(body.email ?? "");
    const cleanEmail = normalizeEmail(rawEmail);

    if (!cleanEmail || !EMAIL_RE.test(cleanEmail) || cleanEmail.length > 150) {
      return NextResponse.json(
        { error: "Por favor, informe um endereço de e-mail válido." },
        { status: 400 }
      );
    }

    // Rate Limiting por E-mail: máx 3 solicitações por e-mail a cada 10 minutos
    const emailRateLimit = checkRateLimit(`pw-recovery-email:${cleanEmail}`, {
      maxRequests: 3,
      windowSeconds: 600,
      blockDurationSeconds: 1200,
    });

    if (!emailRateLimit.success) {
      return NextResponse.json(
        { error: "Muitos pedidos para este e-mail. Por favor, aguarde alguns minutos." },
        {
          status: 429,
          headers: { "Retry-After": String(emailRateLimit.retryAfterSeconds ?? 60) },
        }
      );
    }

    const admin = getSupabaseAdmin();

    // 1. Verifica se a conta existe (em profiles ou no Auth)
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    let authUserExists = Boolean(profile?.id);

    if (!authUserExists) {
      const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
      const found = listData?.users?.find(
        (u) => u.email && normalizeEmail(u.email) === cleanEmail
      );
      if (found) {
        authUserExists = true;
        try {
          await admin.from("profiles").upsert({
            id: found.id,
            email: cleanEmail,
            name: (found.user_metadata?.name as string) || cleanEmail.split("@")[0],
            subscription_status: "inactive",
            access_type: "none",
          });
        } catch (repairErr) {
          console.warn("[recuperar-senha] Falha ao autorreparar perfil:", repairErr);
        }
      }
    }

    // 2. Se a conta existir, dispara o link oficial de redefinição
    if (authUserExists) {
      const origin = siteUrl(request);
      const redirectTo = `${origin}/redefinir-senha`;

      const { error: resetError } = await getSupabaseAnonServer().auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (resetError) {
        console.error(`[recuperar-senha] Erro ao disparar e-mail de recuperação para ${cleanEmail}:`, resetError.message);
      } else {
        console.log(`[recuperar-senha] E-mail de redefinição despachado para: ${cleanEmail}`);
      }
    } else {
      // Log seguro apenas no servidor para monitoramento
      console.log(`[recuperar-senha] Consulta para e-mail não cadastrado (resposta genérica enviada): ${cleanEmail}`);
    }

    // RESPOSTA UNIFORME CONTRA USER ENUMERATION:
    // Retorna exatamente a mesma mensagem de sucesso independente do e-mail existir ou não.
    return NextResponse.json({
      success: true,
      message: "Se este e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha em instantes. Verifique sua caixa de entrada e a pasta de spam.",
    });
  } catch (err: unknown) {
    console.error("[recuperar-senha] Erro inesperado:", err);
    return NextResponse.json(
      { error: "Ocorreu um erro ao processar sua solicitação. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
