import { NextResponse } from "next/server";
import { getStudentAccess, getUserFromBearer } from "@/lib/access";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { signR2VideoPlayback } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  let user = await getUserFromBearer(request);
  if (!user) {
    try {
      const { createClientServer } = await import("@/lib/supabase/server");
      const supabase = await createClientServer();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      user = null;
    }
  }
  if (!user) return NextResponse.json({ error: "Entre na sua conta para assistir à aula." }, { status: 401 });

  const { hasAccess } = await getStudentAccess(user.id);
  if (!hasAccess) return NextResponse.json({ error: "Seu acesso não está ativo." }, { status: 403 });

  try {
    const { id } = await params;
    const admin = getSupabaseAdmin();
    const { data: lesson, error } = await admin.from("lessons")
      .select("id, video_url, video_provider, video_storage_key, category_id, subcategory_id, status")
      .eq("id", id).eq("status", "publicado").maybeSingle();
    if (error) throw error;
    if (!lesson) return NextResponse.json({ error: "A aula não está disponível." }, { status: 404 });

    const [category, subcategory] = await Promise.all([
      admin.from("categories").select("published").eq("id", lesson.category_id).maybeSingle(),
      admin.from("subcategories").select("published").eq("id", lesson.subcategory_id).maybeSingle(),
    ]);
    if (category.error || subcategory.error) throw category.error || subcategory.error;
    if (!category.data?.published || !subcategory.data?.published) {
      return NextResponse.json({ error: "A aula está temporariamente em atualização." }, { status: 404 });
    }

    if (lesson.video_provider !== "r2") {
      if (!lesson.video_url) return NextResponse.json({ error: "O vídeo desta aula ainda não foi configurado." }, { status: 404 });
      return NextResponse.json({ url: lesson.video_url, expiresIn: null }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (!lesson.video_storage_key) return NextResponse.json({ error: "O vídeo desta aula ainda não foi configurado." }, { status: 404 });
    const url = await signR2VideoPlayback(lesson.video_storage_key);
    return NextResponse.json({ url, expiresIn: 3600 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Falha ao autorizar reprodução de vídeo:", error instanceof Error ? error.message : "erro desconhecido");
    return NextResponse.json({ error: "Não foi possível carregar o vídeo agora." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
