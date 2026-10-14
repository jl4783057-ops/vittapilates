import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStudentAccess, getUserFromBearer } from "@/lib/access";
import { mapDbToLesson } from "@/app/api/admin/lessons/route";

// GET /api/aluna/lessons
// Retorna as aulas publicadas EXCLUSIVAMENTE para alunas com sessão Supabase válida
// e acesso ativo (assinante ativa/trial ou cortesia vigente).
export async function GET(request: Request) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  }

  // 1. Identificar usuária pela sessão Supabase (Bearer ou Cookie Server Client)
  let user = await getUserFromBearer(request);
  if (!user) {
    try {
      const { createClientServer } = await import("@/lib/supabase/server");
      const supabaseServer = await createClientServer();
      const { data: { user: cookieUser } } = await supabaseServer.auth.getUser();
      user = cookieUser;
    } catch {
      // Fallback
    }
  }

  if (!user) {
    return NextResponse.json({ error: "Sessão inválida. Faça login para acessar as aulas." }, { status: 401 });
  }

  // 2. Verificar estritamente o status de acesso no banco
  const { hasAccess } = await getStudentAccess(user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "Acesso inativo ou não autorizado." }, { status: 403 });
  }

  // 3. Usuária autorizada: buscar aulas publicadas no Supabase
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("lessons")
      .select("*")
      .eq("status", "publicado")
      .order("display_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      { lessons: (data || []).map(mapDbToLesson) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    console.error("Erro ao buscar aulas da aluna:", err);
    return NextResponse.json(
      { error: "Erro ao carregar catálogo de aulas." },
      { status: 500 }
    );
  }
}
