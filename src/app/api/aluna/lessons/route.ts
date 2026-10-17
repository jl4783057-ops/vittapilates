import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStudentAccess, getUserFromBearer } from "@/lib/access";
import { mapDbToLesson } from "@/app/api/admin/lessons/route";
import { mapDbToCategory } from "@/app/api/admin/categories/route";
import { mapDbToSubcategory } from "@/app/api/admin/subcategories/route";

// GET /api/aluna/lessons
// Retorna as aulas publicadas EXCLUSIVAMENTE para alunas com sessão Supabase válida
// e acesso ativo (assinante ativa/trial ou cortesia vigente).
// Apenas aulas cujas categoria e subcategoria estejam com status 'available' (Disponível).
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
    const [catsRes, subsRes, lessonsRes] = await Promise.all([
      admin.from("categories").select("*"),
      admin.from("subcategories").select("*"),
      admin.from("lessons").select("*").eq("status", "publicado").order("display_order", { ascending: true }),
    ]);

    if (lessonsRes.error) throw lessonsRes.error;

    const categories = (catsRes.data || []).map(mapDbToCategory);
    const subcategories = (subsRes.data || []).map(mapDbToSubcategory);

    // Conjunto de categorias estritamente 'available'
    const availableCategoryIds = new Set(
      categories.filter((c) => c.status === "available").map((c) => c.id)
    );

    // Conjunto de subcategorias estritamente 'available' pertencentes a categoria 'available'
    const availableSubcategoryIds = new Set(
      subcategories
        .filter((s) => s.status === "available" && availableCategoryIds.has(s.categoryId))
        .map((s) => s.id)
    );

    // Filtra aulas pertencentes a categorias e subcategorias 100% disponíveis
    const availableLessons = (lessonsRes.data || []).filter(
      (l) => availableCategoryIds.has(l.category_id) && availableSubcategoryIds.has(l.subcategory_id)
    );

    return NextResponse.json(
      { lessons: availableLessons.map((row) => mapDbToLesson(row, false)) },
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
