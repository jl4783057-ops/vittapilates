import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/access";
import { Lesson, LessonLevel, LessonFormat, LessonEquipment, LessonStatus } from "@/types";
import { INITIAL_LESSONS } from "@/lib/data/initial-data";

export function mapDbToLesson(row: Record<string, unknown>, includePrivateStorageKey = true): Lesson {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    categoryId: String(row.category_id),
    subcategoryId: String(row.subcategory_id),
    durationMinutes: Number(row.duration_minutes ?? 15),
    level: (row.level as LessonLevel) || "iniciante",
    format: (row.format as LessonFormat) || "aula rápida",
    equipment: (row.equipment as LessonEquipment) || "sem equipamento",
    materials: typeof row.materials === "string" ? row.materials : "Tapete de Pilates (Mat)",
    thumbnailUrl: String(row.thumbnail_url),
    videoUrl: row.video_provider === "r2" ? "" : String(row.video_url || ""),
    videoProvider: row.video_provider === "r2" ? "r2" : "external",
    ...(includePrivateStorageKey && typeof row.video_storage_key === "string"
      ? { videoStorageKey: row.video_storage_key }
      : {}),
    order: Number(row.display_order ?? 0),
    status: (row.status as LessonStatus) || "publicado",
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    viewsCount: Number(row.views_count ?? 0),
    completionsCount: Number(row.completions_count ?? 0),
  };
}

export function mapLessonToDb(lesson: Lesson): Record<string, unknown> {
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    category_id: lesson.categoryId,
    subcategory_id: lesson.subcategoryId,
    duration_minutes: lesson.durationMinutes,
    level: lesson.level,
    format: lesson.format,
    equipment: lesson.equipment,
    materials: lesson.materials || null,
    thumbnail_url: lesson.thumbnailUrl,
    video_url: lesson.videoProvider === "r2" ? "" : lesson.videoUrl,
    video_provider: lesson.videoProvider === "r2" ? "r2" : "external",
    video_storage_key: lesson.videoProvider === "r2" ? lesson.videoStorageKey || null : null,
    display_order: lesson.order,
    status: lesson.status,
    tags: lesson.tags || [],
    views_count: lesson.viewsCount ?? 0,
    completions_count: lesson.completionsCount ?? 0,
  };
}

// GET: Retorna todas as aulas compartilhadas (exclusivo para administradora autenticada)
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ configured: false, lessons: INITIAL_LESSONS }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("lessons")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Erro ao listar aulas do Supabase:", error.message);
      return NextResponse.json({ configured: true, lessons: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ configured: true, lessons: (data || []).map((row) => mapDbToLesson(row)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Erro ao listar aulas:", err);
    return NextResponse.json({ configured: false, lessons: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}

// POST: Cria uma nova aula no Supabase (admin apenas)
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  try {
    const body: Lesson = await request.json();
    const dbPayload = mapLessonToDb(body);

    const { data, error } = await getSupabaseAdmin()
      .from("lessons")
      .insert(dbPayload)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, lesson: mapDbToLesson(data) });
  } catch (err: unknown) {
    console.error("Erro ao criar aula:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao salvar aula no banco." },
      { status: 500 }
    );
  }
}

// PUT: Atualiza ou cria em lote aulas (admin apenas)
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  try {
    const body = await request.json();
    if (Array.isArray(body)) {
      const rows = body.map(mapLessonToDb);
      const { data, error } = await getSupabaseAdmin()
        .from("lessons")
        .upsert(rows)
        .select("*");
      if (error) throw error;
    return NextResponse.json({ success: true, lessons: (data || []).map((row) => mapDbToLesson(row)) });
    }

    const lesson: Lesson = body;
    const dbPayload = mapLessonToDb(lesson);
    const { data, error } = await getSupabaseAdmin()
      .from("lessons")
      .upsert(dbPayload)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, lesson: mapDbToLesson(data) });
  } catch (err: unknown) {
    console.error("Erro ao atualizar aula:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao atualizar aula no banco." },
      { status: 500 }
    );
  }
}

// DELETE: Exclui uma aula pelo ID (query param ?id=...)
export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID da aula obrigatório." }, { status: 400 });

  try {
    const { error } = await getSupabaseAdmin().from("lessons").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error("Erro ao deletar aula:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao excluir aula no banco." },
      { status: 500 }
    );
  }
}
