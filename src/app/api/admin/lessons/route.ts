import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/access";
import { Lesson, LessonLevel, LessonFormat, LessonEquipment, LessonStatus } from "@/types";
import { INITIAL_LESSONS } from "@/lib/data/initial-data";

function isMissingExerciseColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const code = String(e.code || "");
  const message = String(e.message || "");
  return (
    code === "PGRST204" ||
    code === "42703" ||
    message.includes("'exercise_id' column") ||
    message.includes("column \"exercise_id\" does not exist") ||
    message.includes("column lessons.exercise_id does not exist")
  );
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const code = String(e.code || "");
  const message = String(e.message || "");
  return (
    code === "PGRST204" ||
    code === "PGRST205" ||
    code === "42P01" ||
    message.includes("public.exercises") ||
    message.includes("'exercises' in the schema cache")
  );
}

function getErrorMessage(err: unknown): string {
  if (!err) return "Erro desconhecido ao processar aula.";
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string" && e.message) return e.message;
    if (typeof e.details === "string" && e.details) return e.details;
    if (typeof e.hint === "string" && e.hint) return e.hint;
  }
  return String(err);
}

function sanitizeIdentifier(id?: unknown): string {
  if (typeof id !== "string") return "";
  return id.trim().replace(/[^a-zA-Z0-9_-]/g, "");
}

export function mapDbToLesson(row: Record<string, unknown>, includePrivateStorageKey = true): Lesson {
  const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description || ""),
    categoryId: String(row.category_id),
    subcategoryId: String(row.subcategory_id),
    exerciseId: typeof row.exercise_id === "string" ? row.exercise_id : undefined,
    durationMinutes: Number(row.duration_minutes ?? 15),
    level: (row.level as LessonLevel) || "iniciante",
    format: (row.format as LessonFormat) || "aula rápida",
    equipment: (row.equipment as LessonEquipment) || "sem equipamento",
    materials: typeof row.materials === "string" ? row.materials : "Tapete de Pilates (Mat)",
    thumbnailUrl: String(row.thumbnail_url || ""),
    videoUrl: row.video_provider === "r2" ? "" : String(row.video_url || ""),
    videoProvider: row.video_provider === "r2" ? "r2" : "external",
    ...(includePrivateStorageKey && typeof row.video_storage_key === "string"
      ? { videoStorageKey: row.video_storage_key }
      : {}),
    order: Number(row.display_order ?? 0),
    status: (row.status as LessonStatus) || "publicado",
    tags,
    showCategory: !tags.includes("hide_category"),
    showDescription: !tags.includes("hide_description"),
    showCompletion: !tags.includes("hide_completion"),
    viewsCount: Number(row.views_count ?? 0),
    completionsCount: Number(row.completions_count ?? 0),
  };
}

export function mapLessonToDb(lesson: Lesson): Record<string, unknown> {
  const cleanTags = (lesson.tags || []).filter(
    (t) => !["hide_category", "hide_description", "hide_completion"].includes(t)
  );
  if (lesson.showCategory === false) cleanTags.push("hide_category");
  if (lesson.showDescription === false) cleanTags.push("hide_description");
  if (lesson.showCompletion === false) cleanTags.push("hide_completion");

  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description || "",
    category_id: lesson.categoryId,
    subcategory_id: lesson.subcategoryId,
    exercise_id: lesson.exerciseId || null,
    duration_minutes: lesson.durationMinutes ?? 15,
    level: lesson.level || "iniciante",
    format: lesson.format || "aula rápida",
    equipment: lesson.equipment || "sem equipamento",
    materials: lesson.materials || null,
    thumbnail_url: lesson.thumbnailUrl || "",
    video_url: lesson.videoProvider === "r2" ? "" : lesson.videoUrl,
    video_provider: lesson.videoProvider === "r2" ? "r2" : "external",
    video_storage_key: lesson.videoProvider === "r2" ? lesson.videoStorageKey || null : null,
    display_order: lesson.order ?? 0,
    status: lesson.status || "publicado",
    tags: cleanTags,
    views_count: lesson.viewsCount ?? 0,
    completions_count: lesson.completionsCount ?? 0,
  };
}

// GET: Retorna todas as aulas (exclusivo para administradora autenticada)
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Acesso não autorizado. Sessão de administrador necessária." }, { status: 401 });
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
      console.error("[API lessons GET] Erro ao listar aulas:", error);
      return NextResponse.json({ error: "Erro ao consultar aulas cadastradas." }, { status: 500 });
    }

    return NextResponse.json(
      { configured: true, lessons: (data || []).map((row) => mapDbToLesson(row)) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[API lessons GET] Exceção:", err);
    return NextResponse.json({ error: "Falha interna ao processar requisição." }, { status: 500 });
  }
}

// POST: Cria uma nova aula no Supabase com validação estrita de relações e papel de admin
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Acesso não autorizado. Sessão de administrador necessária." }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 503 });
  }

  const admin = getSupabaseAdmin();

  try {
    const rawBody = await request.json();
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "Payload da requisição inválido." }, { status: 400 });
    }

    const title = typeof rawBody.title === "string" ? rawBody.title.trim() : "";
    const description = typeof rawBody.description === "string" ? rawBody.description.trim() : "";
    const categoryId = sanitizeIdentifier(rawBody.categoryId);
    const subcategoryId = sanitizeIdentifier(rawBody.subcategoryId);
    const exerciseId = rawBody.exerciseId ? sanitizeIdentifier(rawBody.exerciseId) : null;

    if (!title || title.length > 200) {
      return NextResponse.json({ error: "O título da aula é obrigatório e deve ter no máximo 200 caracteres." }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ error: "A categoria é obrigatória." }, { status: 400 });
    }
    if (!subcategoryId) {
      return NextResponse.json({ error: "A subcategoria é obrigatória." }, { status: 400 });
    }

    // 1. Confirma que a subcategoria existe e pertence à categoria informada
    const { data: subcatData, error: subcatErr } = await admin
      .from("subcategories")
      .select("id, category_id")
      .eq("id", subcategoryId)
      .maybeSingle();

    if (subcatErr) {
      console.error("[API lessons POST] Erro ao verificar subcategoria:", subcatErr);
      return NextResponse.json({ error: "Erro ao validar integridade da subcategoria." }, { status: 500 });
    }
    if (!subcatData) {
      return NextResponse.json({ error: "A subcategoria informada não existe no banco de dados." }, { status: 400 });
    }
    if (subcatData.category_id !== categoryId) {
      return NextResponse.json(
        { error: "A subcategoria informada não pertence à categoria selecionada." },
        { status: 400 }
      );
    }

    // 2. Se a aula estiver vinculada a um exercício, confirma que ele existe e pertence à mesma subcategoria
    if (exerciseId) {
      const { data: exerciseData, error: exerciseErr } = await admin
        .from("exercises")
        .select("id, category_id, subcategory_id")
        .eq("id", exerciseId)
        .maybeSingle();

      if (exerciseErr) {
        if (isMissingTableError(exerciseErr)) {
          return NextResponse.json(
            {
              error: "A tabela de exercícios ainda não foi criada no Supabase. Aplique a migração 006_exercises_hierarchy.sql antes de vincular aulas a exercícios.",
              needsMigration: true,
            },
            { status: 400 }
          );
        }
        console.error("[API lessons POST] Erro ao verificar exercício:", exerciseErr);
        return NextResponse.json({ error: "Erro ao validar integridade do exercício." }, { status: 500 });
      }

      if (!exerciseData) {
        return NextResponse.json({ error: "O exercício informado não foi encontrado." }, { status: 400 });
      }

      // REGRA DE SEGURANÇA: Impede que a aula seja vinculada a um exercício de outra subcategoria ou categoria
      if (exerciseData.subcategory_id !== subcategoryId) {
        return NextResponse.json(
          { error: "O exercício selecionado pertence a outra subcategoria e não pode ser vinculado a esta aula." },
          { status: 400 }
        );
      }
      if (exerciseData.category_id !== categoryId) {
        return NextResponse.json(
          { error: "O exercício selecionado pertence a outra categoria e não pode ser vinculado a esta aula." },
          { status: 400 }
        );
      }
    }

    // 3. Validação dos campos técnicos da aula
    const durationMinutes =
      typeof rawBody.durationMinutes === "number" && rawBody.durationMinutes > 0
        ? Math.min(Math.round(rawBody.durationMinutes), 600)
        : 15;

    const validLevels: LessonLevel[] = ["iniciante", "intermediário", "avançado"];
    const level: LessonLevel = validLevels.includes(rawBody.level) ? rawBody.level : "iniciante";

    const validFormats: LessonFormat[] = ["aula rápida", "aula completa", "sequência guiada", "programa por dias"];
    const format: LessonFormat = validFormats.includes(rawBody.format) ? rawBody.format : "aula rápida";

    const validEquipments: LessonEquipment[] = ["sem equipamento", "com acessórios"];
    const equipment: LessonEquipment = validEquipments.includes(rawBody.equipment) ? rawBody.equipment : "sem equipamento";

    const validStatuses: LessonStatus[] = ["rascunho", "publicado"];
    const status: LessonStatus = validStatuses.includes(rawBody.status) ? rawBody.status : "publicado";

    const videoProvider = rawBody.videoProvider === "r2" ? "r2" : "external";
    const videoStorageKey = videoProvider === "r2" && typeof rawBody.videoStorageKey === "string" ? rawBody.videoStorageKey.trim() : null;
    const videoUrl = videoProvider === "external" && typeof rawBody.videoUrl === "string" ? rawBody.videoUrl.trim() : "";
    const thumbnailUrl = typeof rawBody.thumbnailUrl === "string" ? rawBody.thumbnailUrl.trim() : "";

    const finalId = sanitizeIdentifier(rawBody.id) || `les-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const tags = Array.isArray(rawBody.tags) ? [...rawBody.tags] : [];
    const cleanTags = tags.filter((t) => !["hide_category", "hide_description", "hide_completion"].includes(t));
    if (rawBody.showCategory === false) cleanTags.push("hide_category");
    if (rawBody.showDescription === false) cleanTags.push("hide_description");
    if (rawBody.showCompletion === false) cleanTags.push("hide_completion");

    const dbPayload = {
      id: finalId,
      title,
      description,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      exercise_id: exerciseId,
      duration_minutes: durationMinutes,
      level,
      format,
      equipment,
      materials: typeof rawBody.materials === "string" ? rawBody.materials.trim() : null,
      thumbnail_url: thumbnailUrl,
      video_url: videoUrl,
      video_provider: videoProvider,
      video_storage_key: videoStorageKey,
      display_order: typeof rawBody.order === "number" ? rawBody.order : 0,
      status,
      tags: cleanTags,
      views_count: 0,
      completions_count: 0,
    };

    let insertRes = await admin
      .from("lessons")
      .insert(dbPayload)
      .select("*")
      .single();

    if (insertRes.error && isMissingExerciseColumnError(insertRes.error)) {
      console.warn(
        "[API lessons POST] Coluna 'exercise_id' ausente no schema Supabase. Para suporte completo à hierarquia de exercícios, aplique a migração 006_exercises_hierarchy.sql no Supabase SQL Editor. Salvando sem exercise_id."
      );
      const { exercise_id: _omitted, ...fallbackPayload } = dbPayload;
      insertRes = await admin
        .from("lessons")
        .insert(fallbackPayload)
        .select("*")
        .single();
    }

    if (insertRes.error) {
      console.error("[API lessons POST] Erro de banco:", insertRes.error);
      return NextResponse.json({ error: getErrorMessage(insertRes.error) }, { status: 500 });
    }

    return NextResponse.json({ success: true, lesson: mapDbToLesson(insertRes.data) });
  } catch (err: unknown) {
    console.error("[API lessons POST] Exceção:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// PUT: Atualiza uma aula ou lote de aulas com validação estrita (admin apenas)
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Acesso não autorizado. Sessão de administrador necessária." }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 503 });
  }

  const admin = getSupabaseAdmin();

  try {
    const body = await request.json();

    // Caso A: Reordenação ou atualização em lote
    if (Array.isArray(body)) {
      const rows = body.map(mapLessonToDb);
      let upsertRes = await admin
        .from("lessons")
        .upsert(rows)
        .select("*");

      if (upsertRes.error && isMissingExerciseColumnError(upsertRes.error)) {
        console.warn("[API lessons PUT batch] Coluna 'exercise_id' ausente. Executando fallback.");
        const fallbackRows = rows.map((r) => {
          const { exercise_id: _omitted, ...rest } = r;
          return rest;
        });
        upsertRes = await admin
          .from("lessons")
          .upsert(fallbackRows)
          .select("*");
      }

      if (upsertRes.error) {
        console.error("[API lessons PUT batch] Erro de banco:", upsertRes.error);
        return NextResponse.json({ error: getErrorMessage(upsertRes.error) }, { status: 500 });
      }

      return NextResponse.json({ success: true, lessons: (upsertRes.data || []).map((row) => mapDbToLesson(row)) });
    }

    // Caso B: Edição de aula única
    const rawLesson = body as Partial<Lesson>;
    const lessonId = sanitizeIdentifier(rawLesson.id);

    if (!lessonId) {
      return NextResponse.json({ error: "ID da aula obrigatório para atualização." }, { status: 400 });
    }

    const { data: existingLesson, error: findError } = await admin
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .maybeSingle();

    if (findError || !existingLesson) {
      return NextResponse.json({ error: "Aula não encontrada para atualização." }, { status: 404 });
    }

    const targetCategoryId = rawLesson.categoryId ? sanitizeIdentifier(rawLesson.categoryId) : existingLesson.category_id;
    const targetSubcategoryId = rawLesson.subcategoryId ? sanitizeIdentifier(rawLesson.subcategoryId) : existingLesson.subcategory_id;
    const targetExerciseId =
      rawLesson.exerciseId !== undefined
        ? rawLesson.exerciseId ? sanitizeIdentifier(rawLesson.exerciseId) : null
        : existingLesson.exercise_id;

    // 1. Confirma que subcategoria pertence à categoria
    const { data: subcatData, error: subcatErr } = await admin
      .from("subcategories")
      .select("id, category_id")
      .eq("id", targetSubcategoryId)
      .maybeSingle();

    if (subcatErr || !subcatData) {
      return NextResponse.json({ error: "Subcategoria destino não encontrada." }, { status: 400 });
    }
    if (subcatData.category_id !== targetCategoryId) {
      return NextResponse.json(
        { error: "A subcategoria informada não pertence à categoria selecionada." },
        { status: 400 }
      );
    }

    // 2. Se a aula tiver vínculo com exercício, confirma que ele pertence à mesma subcategoria
    if (targetExerciseId) {
      const { data: exData, error: exErr } = await admin
        .from("exercises")
        .select("id, category_id, subcategory_id")
        .eq("id", targetExerciseId)
        .maybeSingle();

      if (exErr) {
        if (isMissingTableError(exErr)) {
          return NextResponse.json(
            {
              error: "A tabela de exercícios ainda não foi criada no Supabase. Aplique a migração 006_exercises_hierarchy.sql antes de vincular aulas a exercícios.",
              needsMigration: true,
            },
            { status: 400 }
          );
        }
        return NextResponse.json({ error: "Erro ao validar integridade do exercício." }, { status: 500 });
      }
      if (!exData) {
        return NextResponse.json({ error: "O exercício informado não foi encontrado." }, { status: 400 });
      }

      // Impede que aula seja associada a exercício de outra subcategoria
      if (exData.subcategory_id !== targetSubcategoryId) {
        return NextResponse.json(
          { error: "O exercício selecionado pertence a outra subcategoria e não pode ser vinculado a esta aula." },
          { status: 400 }
        );
      }
      if (exData.category_id !== targetCategoryId) {
        return NextResponse.json(
          { error: "O exercício selecionado pertence a outra categoria e não pode ser vinculado a esta aula." },
          { status: 400 }
        );
      }
    }

    const title = typeof rawLesson.title === "string" ? rawLesson.title.trim() : existingLesson.title;
    if (!title) {
      return NextResponse.json({ error: "O título da aula não pode ser vazio." }, { status: 400 });
    }

    const videoProvider = rawLesson.videoProvider === "r2" ? "r2" : (rawLesson.videoProvider === "external" ? "external" : existingLesson.video_provider);
    const videoStorageKey =
      videoProvider === "r2"
        ? (rawLesson.videoStorageKey !== undefined ? rawLesson.videoStorageKey : existingLesson.video_storage_key)
        : null;

    const incomingTags = Array.isArray(rawLesson.tags) ? rawLesson.tags : existingLesson.tags || [];
    const cleanTags = incomingTags.filter((t: string) => !["hide_category", "hide_description", "hide_completion"].includes(t));
    const showCat = rawLesson.showCategory !== undefined ? rawLesson.showCategory : !incomingTags.includes("hide_category");
    const showDesc = rawLesson.showDescription !== undefined ? rawLesson.showDescription : !incomingTags.includes("hide_description");
    const showComp = rawLesson.showCompletion !== undefined ? rawLesson.showCompletion : !incomingTags.includes("hide_completion");
    if (showCat === false) cleanTags.push("hide_category");
    if (showDesc === false) cleanTags.push("hide_description");
    if (showComp === false) cleanTags.push("hide_completion");

    const dbPayload = {
      id: lessonId,
      title,
      description: rawLesson.description !== undefined ? rawLesson.description : existingLesson.description,
      category_id: targetCategoryId,
      subcategory_id: targetSubcategoryId,
      exercise_id: targetExerciseId,
      duration_minutes: typeof rawLesson.durationMinutes === "number" ? rawLesson.durationMinutes : existingLesson.duration_minutes,
      level: rawLesson.level || existingLesson.level,
      format: rawLesson.format || existingLesson.format,
      equipment: rawLesson.equipment || existingLesson.equipment,
      materials: rawLesson.materials !== undefined ? rawLesson.materials : existingLesson.materials,
      thumbnail_url: rawLesson.thumbnailUrl !== undefined ? rawLesson.thumbnailUrl : (existingLesson.thumbnail_url || ""),
      video_url: videoProvider === "r2" ? "" : (rawLesson.videoUrl !== undefined ? rawLesson.videoUrl : existingLesson.video_url),
      video_provider: videoProvider,
      video_storage_key: videoStorageKey,
      display_order: rawLesson.order !== undefined ? rawLesson.order : existingLesson.display_order,
      status: rawLesson.status || existingLesson.status,
      tags: cleanTags,
      views_count: existingLesson.views_count ?? 0,
      completions_count: existingLesson.completions_count ?? 0,
    };

    let updateRes = await admin
      .from("lessons")
      .upsert(dbPayload)
      .select("*")
      .single();

    if (updateRes.error && isMissingExerciseColumnError(updateRes.error)) {
      console.warn(`[API lessons PUT] Fallback de exercise_id ao salvar aula "${title}".`);
      const { exercise_id: _omitted, ...fallbackPayload } = dbPayload;
      updateRes = await admin
        .from("lessons")
        .upsert(fallbackPayload)
        .select("*")
        .single();
    }

    if (updateRes.error) {
      console.error("[API lessons PUT] Erro de banco:", updateRes.error);
      return NextResponse.json({ error: getErrorMessage(updateRes.error) }, { status: 500 });
    }

    return NextResponse.json({ success: true, lesson: mapDbToLesson(updateRes.data) });
  } catch (err: unknown) {
    console.error("[API lessons PUT] Exceção:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// DELETE: Exclui uma aula pelo ID (admin apenas)
export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Acesso não autorizado. Sessão de administrador necessária." }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get("id");
  const id = sanitizeIdentifier(rawId);
  if (!id) return NextResponse.json({ error: "ID da aula obrigatório para exclusão." }, { status: 400 });

  try {
    const { error } = await getSupabaseAdmin().from("lessons").delete().eq("id", id);
    if (error) {
      console.error("[API lessons DELETE] Erro:", error);
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error("[API lessons DELETE] Exceção:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
