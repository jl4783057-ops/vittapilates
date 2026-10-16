import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseAnonServer, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { normalizeEmail, siteUrl } from "@/lib/access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Resposta unificada para rota de recuperação de senha
export async function POST(request: NextRequest) {
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

    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Por favor, informe um endereço de e-mail válido." },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // 1. Verifica se a usuária possui conta cadastrada em profiles
    const { data: profile } = await admin
      .from("profiles")
      .select("id, email, name")
      .eq("email", cleanEmail)
      .maybeSingle();

    // 2. Se não encontrou no profile, verifica se existe usuário no Supabase Auth
    let authUserExists = false;
    let authUserId: string | null = null;
    let userName: string = profile?.name || "";

    if (profile?.id) {
      authUserExists = true;
      authUserId = profile.id;
    } else {
      // Caso de inconsistência onde a conta existe no Auth mas não no profiles
      const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
      const found = listData?.users?.find(
        (u) => u.email && normalizeEmail(u.email) === cleanEmail
      );
      if (found) {
        authUserExists = true;
        authUserId = found.id;
        userName = (found.user_metadata?.name as string) || "";
        
        // Auto-repara o perfil ausente para evitar que o usuário fique em limbo
        try {
          await admin.from("profiles").upsert({
            id: found.id,
            email: cleanEmail,
            name: userName || cleanEmail.split("@")[0],
            subscription_status: "inactive",
            access_type: "none",
          });
        } catch (repairErr) {
          console.warn("[recuperar-senha] Falha ao autorreparar perfil:", repairErr);
        }
      }
    }

    // 3. Se a conta NÃO existir nem no profile nem no Auth:
    if (!authUserExists) {
      console.log(`[recuperar-senha] E-mail não cadastrado consultado: ${cleanEmail}`);
      return NextResponse.json({
        exists: false,
        message: "Não encontramos uma conta com este e-mail. Confira se digitou corretamente. Se você ainda não tem acesso, entre em contato com o suporte.",
      });
    }

    // 4. Se a conta EXISTIR: dispara a redefinição de senha oficial via Supabase
    const origin = siteUrl(request);
    const redirectTo = `${origin}/redefinir-senha`;

    const { error: resetError } = await getSupabaseAnonServer().auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    if (resetError) {
      console.error(`[recuperar-senha] Erro ao disparar e-mail de recuperação:`, resetError.message);
      if (resetError.message.toLowerCase().includes("too many requests") || resetError.status === 429) {
        return NextResponse.json(
          { error: "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de solicitar novamente." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "Não foi possível enviar o e-mail de recuperação no momento. Tente novamente mais tarde." },
        { status: 502 }
      );
    }

    console.log(`[recuperar-senha] Link de recuperação enviado com sucesso para ${cleanEmail} (userId: ${authUserId})`);

    return NextResponse.json({
      exists: true,
      message: "Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha. Verifique sua caixa de entrada e o spam.",
      email: cleanEmail,
    });
  } catch (err: unknown) {
    console.error("[recuperar-senha] Erro inesperado na rota:", err);
    return NextResponse.json(
      { error: "Ocorreu um erro ao processar sua solicitação. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
