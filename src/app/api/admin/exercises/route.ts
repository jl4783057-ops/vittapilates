import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/access";
import { Exercise } from "@/types";

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
  if (!err) return "Erro desconhecido ao processar exercício.";
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

export function mapDbToExercise(row: Record<string, unknown>): Exercise {
  return {
    id: String(row.id),
    categoryId: String(row.category_id),
    subcategoryId: String(row.subcategory_id),
    title: String(row.title),
    description: typeof row.description === "string" ? row.description : undefined,
    order: Number(row.display_order ?? 0),
    createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

export function mapExerciseToDb(ex: Exercise): Record<string, unknown> {
  return {
    id: ex.id,
    category_id: ex.categoryId,
    subcategory_id: ex.subcategoryId,
    title: ex.title,
    description: ex.description || null,
    display_order: ex.order,
  };
}

// GET: Retorna os exercícios cadastrados (exclusivo para administradora autenticada)
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Acesso não autorizado. Sessão de administrador necessária." }, { status: 401 });
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ configured: false, exercises: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const { searchParams } = new URL(request.url);
  const rawSubcategoryId = searchParams.get("subcategoryId");
  const rawCategoryId = searchParams.get("categoryId");

  const subcategoryId = rawSubcategoryId ? sanitizeIdentifier(rawSubcategoryId) : null;
  const categoryId = rawCategoryId ? sanitizeIdentifier(rawCategoryId) : null;

  try {
    let query = getSupabaseAdmin()
      .from("exercises")
      .select("*")
      .order("display_order", { ascending: true });

    if (subcategoryId) {
      query = query.eq("subcategory_id", subcategoryId);
    }
    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        console.warn(
          "[API exercises GET] Tabela 'exercises' ainda não existe no Supabase. Para habilitar a hierarquia de exercícios, aplique a migração 006_exercises_hierarchy.sql no Supabase SQL Editor."
        );
        return NextResponse.json({ configured: true, exercises: [], needsMigration: true }, { headers: { "Cache-Control": "no-store" } });
      }
      console.error("[API exercises GET] Erro de banco:", error);
      return NextResponse.json({ error: "Erro ao consultar exercícios." }, { status: 500 });
    }

    return NextResponse.json(
      { configured: true, exercises: (data || []).map(mapDbToExercise) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[API exercises GET] Exceção:", err);
    return NextResponse.json({ error: "Falha interna ao processar requisição." }, { status: 500 });
  }
}

// POST: Cria um novo exercício com validação rigorosa no servidor (admin apenas)
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Acesso não autorizado. Sessão de administrador necessária." }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 503 });
  }

  try {
    const rawBody = await request.json();
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "Payload da requisição inválido." }, { status: 400 });
    }

    const title = typeof rawBody.title === "string" ? rawBody.title.trim() : "";
    const description = typeof rawBody.description === "string" ? rawBody.description.trim() : null;
    const categoryId = sanitizeIdentifier(rawBody.categoryId);
    const subcategoryId = sanitizeIdentifier(rawBody.subcategoryId);
    const providedId = sanitizeIdentifier(rawBody.id);

    if (!title || title.length > 150) {
      return NextResponse.json({ error: "O título do exercício é obrigatório e deve ter no máximo 150 caracteres." }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ error: "A categoria de vínculo é obrigatória." }, { status: 400 });
    }
    if (!subcategoryId) {
      return NextResponse.json({ error: "A subcategoria de vínculo é obrigatória." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // 1. Validação relacional: confirma existência e pertencimento da subcategoria à categoria
    const { data: subcategoryData, error: subcategoryError } = await admin
      .from("subcategories")
      .select("id, category_id")
      .eq("id", subcategoryId)
      .maybeSingle();

    if (subcategoryError) {
      console.error("[API exercises POST] Erro ao validar subcategoria:", subcategoryError);
      return NextResponse.json({ error: "Erro ao validar integridade da subcategoria." }, { status: 500 });
    }
    if (!subcategoryData) {
      return NextResponse.json({ error: "A subcategoria informada não existe no banco de dados." }, { status: 400 });
    }
    if (subcategoryData.category_id !== categoryId) {
      return NextResponse.json(
        { error: "A subcategoria informada não pertence à categoria selecionada." },
        { status: 400 }
      );
    }

    // 2. Cálculo seguro de ordenação ou sanitização da ordem informada
    let displayOrder: number;
    if (typeof rawBody.order === "number" && Number.isInteger(rawBody.order) && rawBody.order >= 0) {
      displayOrder = rawBody.order;
    } else {
      const { data: existingList } = await admin
        .from("exercises")
        .select("display_order")
        .eq("subcategory_id", subcategoryId);

      const maxOrder = (existingList || []).reduce((max, cur) => Math.max(max, Number(cur.display_order ?? 0)), -1);
      displayOrder = maxOrder + 1;
    }

    // 3. ID seguro e não previsível
    const finalId = providedId || `ex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const dbPayload = {
      id: finalId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      title,
      description,
      display_order: displayOrder,
    };

    const { data, error } = await admin
      .from("exercises")
      .insert(dbPayload)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error: "A tabela 'exercises' ainda não foi criada no Supabase. Aplique a migração 006_exercises_hierarchy.sql.",
            needsMigration: true,
          },
          { status: 500 }
        );
      }
      console.error("[API exercises POST] Erro de inserção:", error);
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true, exercise: mapDbToExercise(data) });
  } catch (err: unknown) {
    console.error("[API exercises POST] Exceção:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// PUT: Atualiza um exercício ou lote de exercícios para reordenação (admin apenas)
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Acesso não autorizado. Sessão de administrador necessária." }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 503 });
  }

  const admin = getSupabaseAdmin();

  try {
    const rawBody = await request.json();

    // Caso A: Reordenação em lote
    if (Array.isArray(rawBody)) {
      if (rawBody.length === 0) {
        return NextResponse.json({ success: true, exercises: [] });
      }

      // Validação de formato para cada item do lote
      const sanitizedBatch = rawBody.map((item, index) => {
        const id = sanitizeIdentifier(item.id);
        const order = typeof item.order === "number" && Number.isInteger(item.order) ? item.order : index;
        return { id, order };
      });

      const invalidItem = sanitizedBatch.find((item) => !item.id);
      if (invalidItem) {
        return NextResponse.json({ error: "Todos os itens do lote de reordenação devem conter um ID válido." }, { status: 400 });
      }

      const ids = sanitizedBatch.map((i) => i.id);

      // Confirma que todos os exercícios existem no banco
      const { data: dbItems, error: fetchErr } = await admin
        .from("exercises")
        .select("id, category_id, subcategory_id")
        .in("id", ids);

      if (fetchErr) {
        if (isMissingTableError(fetchErr)) {
          return NextResponse.json(
            { error: "Tabela 'exercises' ausente. Aplique a migração 006 no Supabase.", needsMigration: true },
            { status: 500 }
          );
        }
        console.error("[API exercises PUT batch] Erro ao validar IDs:", fetchErr);
        return NextResponse.json({ error: "Erro ao validar exercícios para reordenação." }, { status: 500 });
      }

      const existingMap = new Map((dbItems || []).map((i) => [i.id, i]));
      const missingId = ids.find((id) => !existingMap.has(id));
      if (missingId) {
        return NextResponse.json(
          { error: `O exercício com ID "${missingId}" não foi encontrado no banco de dados.` },
          { status: 404 }
        );
      }

      // Executa a atualização de ordenação mantendo a relação de chaves intacta
      const updates = sanitizedBatch.map((item) => {
        const existing = existingMap.get(item.id)!;
        return {
          id: item.id,
          category_id: existing.category_id,
          subcategory_id: existing.subcategory_id,
          display_order: item.order,
        };
      });

      // Atualiza cada registro garantindo que campos obrigatórios permaneçam consistentes
      for (const u of updates) {
        const { error: updErr } = await admin
          .from("exercises")
          .update({ display_order: u.display_order })
          .eq("id", u.id);

        if (updErr) {
          console.error("[API exercises PUT batch] Erro ao atualizar ordem:", updErr);
          return NextResponse.json({ error: "Falha ao salvar nova ordenação dos exercícios." }, { status: 500 });
        }
      }

      const { data: updatedData } = await admin
        .from("exercises")
        .select("*")
        .in("id", ids)
        .order("display_order", { ascending: true });

      return NextResponse.json({ success: true, exercises: (updatedData || []).map(mapDbToExercise) });
    }

    // Caso B: Atualização de exercício único
    const exerciseId = sanitizeIdentifier(rawBody.id);
    if (!exerciseId) {
      return NextResponse.json({ error: "ID do exercício obrigatório para edição." }, { status: 400 });
    }

    const { data: existingExercise, error: findError } = await admin
      .from("exercises")
      .select("*")
      .eq("id", exerciseId)
      .maybeSingle();

    if (findError) {
      console.error("[API exercises PUT] Erro ao buscar exercício:", findError);
      return NextResponse.json({ error: "Erro ao localizar exercício para edição." }, { status: 500 });
    }
    if (!existingExercise) {
      return NextResponse.json({ error: "Exercício não encontrado no banco de dados." }, { status: 404 });
    }

    const title = typeof rawBody.title === "string" ? rawBody.title.trim() : existingExercise.title;
    if (!title || title.length > 150) {
      return NextResponse.json({ error: "O título do exercício é obrigatório e deve ter no máximo 150 caracteres." }, { status: 400 });
    }

    const description =
      rawBody.description !== undefined
        ? typeof rawBody.description === "string"
          ? rawBody.description.trim()
          : null
        : existingExercise.description;

    const targetCategoryId = rawBody.categoryId ? sanitizeIdentifier(rawBody.categoryId) : existingExercise.category_id;
    const targetSubcategoryId = rawBody.subcategoryId
      ? sanitizeIdentifier(rawBody.subcategoryId)
      : existingExercise.subcategory_id;

    // Se categoria ou subcategoria foram alteradas, valida a coerência da relação
    if (targetCategoryId !== existingExercise.category_id || targetSubcategoryId !== existingExercise.subcategory_id) {
      const { data: subcatData, error: subcatErr } = await admin
        .from("subcategories")
        .select("id, category_id")
        .eq("id", targetSubcategoryId)
        .maybeSingle();

      if (subcatErr || !subcatData) {
        return NextResponse.json({ error: "Subcategoria destino inválida ou não encontrada." }, { status: 400 });
      }
      if (subcatData.category_id !== targetCategoryId) {
        return NextResponse.json(
          { error: "A subcategoria destino não pertence à categoria selecionada." },
          { status: 400 }
        );
      }
    }

    const displayOrder =
      typeof rawBody.order === "number" && Number.isInteger(rawBody.order)
        ? rawBody.order
        : existingExercise.display_order;

    const { data: updatedExercise, error: updateError } = await admin
      .from("exercises")
      .update({
        title,
        description,
        category_id: targetCategoryId,
        subcategory_id: targetSubcategoryId,
        display_order: displayOrder,
      })
      .eq("id", exerciseId)
      .select("*")
      .single();

    if (updateError) {
      console.error("[API exercises PUT] Erro ao atualizar:", updateError);
      return NextResponse.json({ error: getErrorMessage(updateError) }, { status: 500 });
    }

    return NextResponse.json({ success: true, exercise: mapDbToExercise(updatedExercise) });
  } catch (err: unknown) {
    console.error("[API exercises PUT] Exceção:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// DELETE: Exclui um exercício com desvinculação segura das aulas (ON DELETE SET NULL preservado)
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

  if (!id) {
    return NextResponse.json({ error: "ID do exercício obrigatório para exclusão." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  try {
    // 1. Verifica se o exercício existe
    const { data: existing, error: checkError } = await admin
      .from("exercises")
      .select("id, title")
      .eq("id", id)
      .maybeSingle();

    if (checkError) {
      if (isMissingTableError(checkError)) {
        return NextResponse.json({ error: "Tabela 'exercises' ainda não existe no Supabase." }, { status: 500 });
      }
      console.error("[API exercises DELETE] Erro ao consultar exercício:", checkError);
      return NextResponse.json({ error: "Erro ao verificar existência do exercício." }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Exercício não encontrado." }, { status: 404 });
    }

    // 2. Desvinculação explícita de segurança:
    // Garante no código que nenhuma aula ou vídeo seja apagado
    const { error: unlinkError } = await admin
      .from("lessons")
      .update({ exercise_id: null })
      .eq("exercise_id", id);

    if (unlinkError) {
      console.warn("[API exercises DELETE] Aviso ao desvincular aulas do exercício (coluna pode ainda não existir):", unlinkError);
    }

    // 3. Exclusão do registro de exercício
    const { error: deleteError } = await admin.from("exercises").delete().eq("id", id);

    if (deleteError) {
      console.error("[API exercises DELETE] Erro de exclusão:", deleteError);
      return NextResponse.json({ error: getErrorMessage(deleteError) }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id,
      message: `Exercício "${existing.title}" excluído com sucesso. Suas aulas continuam salvas no tema sem perda de vídeos.`,
    });
  } catch (err: unknown) {
    console.error("[API exercises DELETE] Exceção:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
