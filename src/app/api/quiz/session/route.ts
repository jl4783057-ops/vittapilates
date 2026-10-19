import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/access";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate Limiting: Máximo de 10 submissões de quiz a cada 10 minutos por IP
  const rateLimit = checkRateLimit(`quiz-submit:${ip}`, {
    maxRequests: 10,
    windowSeconds: 600,
    blockDurationSeconds: 1200,
  });

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Muitas submissões em pouco tempo. Por favor, aguarde alguns minutos." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds ?? 60) },
      }
    );
  }

  try {
    const rawText = await request.text();
    // Prevenção contra estouro de memória / DoS de payload (limite de 64 KB)
    if (rawText.length > 64 * 1024) {
      return NextResponse.json({ error: "Payload excessivo." }, { status: 413 });
    }

    let body: Record<string, unknown> | null = null;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    if (!sessionId || !UUID_REGEX.test(sessionId)) {
      return NextResponse.json({ error: "Identificador de sessão de quiz inválido." }, { status: 400 });
    }

    let email: string | null = null;
    if (typeof body.email === "string" && body.email.trim()) {
      const cleanEmail = body.email.trim().toLowerCase();
      if (EMAIL_REGEX.test(cleanEmail) && cleanEmail.length <= 150) {
        email = cleanEmail;
      }
    }

    const answers = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
      ? (body.answers as Record<string, unknown>)
      : {};

    const generatedPlan = body.generatedPlan && typeof body.generatedPlan === "object" && !Array.isArray(body.generatedPlan)
      ? (body.generatedPlan as Record<string, unknown>)
      : {};

    if (!isSupabaseAdminConfigured) {
      return NextResponse.json({ ok: true, offline: true });
    }

    const admin = getSupabaseAdmin();

    const payload = {
      id: sessionId,
      answers: {
        ...answers,
        ...(email ? { email } : {}),
      },
      generated_plan: generatedPlan,
    };

    const { error } = await admin
      .from("quiz_submissions")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("[quiz/session POST] Erro ao salvar submissão do quiz:", error.message);
      return NextResponse.json(
        { error: "Não foi possível registrar as respostas do quiz no servidor." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, sessionId });
  } catch (err) {
    console.error("[quiz/session POST] Falha inesperada:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Ocorreu uma falha ao processar a solicitação." },
      { status: 500 }
    );
  }
}

// GET: Proteção contra IDOR / Vazamento de PII.
// Apenas administradores autenticados podem consultar submissões do quiz por ID.
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { error: "Acesso restrito ao painel administrativo." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id")?.trim();

    if (!sessionId || !UUID_REGEX.test(sessionId)) {
      return NextResponse.json({ error: "ID de sessão inválido." }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured) {
      return NextResponse.json({ error: "Banco de dados não configurado." }, { status: 503 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("quiz_submissions")
      .select("id, answers, generated_plan, created_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) {
      console.error("[quiz/session GET] Erro ao buscar submissão:", error.message);
      return NextResponse.json(
        { error: "Erro ao consultar dados da sessão no banco." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, session: data });
  } catch (err) {
    console.error("[quiz/session GET] Falha inesperada:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Falha interna ao recuperar dados da sessão." },
      { status: 500 }
    );
  }
}
