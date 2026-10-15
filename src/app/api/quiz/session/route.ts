import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
    }

    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    const answers = body.answers ?? {};
    const generatedPlan = body.generatedPlan ?? {};

    // Validar formato UUID aceito pelo PostgreSQL
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!sessionId || !uuidRegex.test(sessionId)) {
      return NextResponse.json({ error: "Identificador de sessão inválido" }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured) {
      // Retorna sucesso para não travar a navegação da usuária se Supabase não estiver conectado
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
      console.error("Erro ao salvar submissão do quiz:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sessionId });
  } catch (err) {
    console.error("Falha inesperada ao registrar sessão do quiz:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");

    if (!sessionId) {
      return NextResponse.json({ error: "ID de sessão obrigatório" }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured) {
      return NextResponse.json({ error: "Banco de dados não configurado" }, { status: 503 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("quiz_submissions")
      .select("id, answers, generated_plan, created_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, session: data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
