import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/access";
import { Category, PublicationStatus } from "@/types";
import { INITIAL_CATEGORIES } from "@/lib/data/initial-data";

function isMissingStatusColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const code = String(e.code || "");
  const message = String(e.message || "");
  return (
    code === "PGRST204" ||
    code === "42703" ||
    message.includes("'status' column") ||
    message.includes("column \"status\" does not exist") ||
    message.includes("column categories.status does not exist")
  );
}

function getErrorMessage(err: unknown): string {
  if (!err) return "Erro desconhecido ao processar categoria.";
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string" && e.message) return e.message;
    if (typeof e.details === "string" && e.details) return e.details;
    if (typeof e.hint === "string" && e.hint) return e.hint;
  }
  return String(err);
}

export function mapDbToCategory(row: Record<string, unknown>): Category {
  const rowId = String(row.id);
  const rawStatus = typeof row.status === "string" ? row.status.trim().toLowerCase() : "";

  let status: PublicationStatus = "available";
  if (rawStatus === "available" || rawStatus === "updating" || rawStatus === "hidden") {
    status = rawStatus as PublicationStatus;
  } else if (row.published === false) {
    status = "hidden";
  } else {
    status = "available";
  }

  return {
    id: rowId,
    slug: String(row.slug),
    name: String(row.name),
    description: typeof row.description === "string" ? row.description : "",
    bannerUrl: typeof row.banner_url === "string" ? row.banner_url : undefined,
    order: Number(row.display_order ?? 0),
    published: status !== "hidden",
    status,
  };
}

export function mapCategoryToDb(cat: Category): Record<string, unknown> {
  const status: PublicationStatus = cat.status || (cat.published === false ? "hidden" : "available");
  return {
    id: cat.id,
    slug: cat.slug,
    name: cat.name,
    description: cat.description || null,
    banner_url: cat.bannerUrl || null,
    display_order: cat.order,
    published: status !== "hidden",
    status,
  };
}

// GET: Retorna todas as categorias do Supabase
export async function GET() {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ configured: false, categories: INITIAL_CATEGORIES }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("categories")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("[API categories GET] Erro ao listar categorias:", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return NextResponse.json({ configured: true, categories: INITIAL_CATEGORIES }, { headers: { "Cache-Control": "no-store" } });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ configured: true, categories: INITIAL_CATEGORIES }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ configured: true, categories: data.map(mapDbToCategory) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[API categories GET] Exceção inesperada:", err);
    return NextResponse.json({ configured: false, categories: INITIAL_CATEGORIES }, { headers: { "Cache-Control": "no-store" } });
  }
}

// POST: Cria uma nova categoria no Supabase (admin apenas)
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  try {
    const body: Category = await request.json();
    const status: PublicationStatus = body.status || (body.published === false ? "hidden" : "available");
    const dbPayload = mapCategoryToDb({ ...body, status });

    let insertRes = await getSupabaseAdmin()
      .from("categories")
      .insert(dbPayload)
      .select("*")
      .single();

    let missingStatusCol = false;
    if (insertRes.error && isMissingStatusColumnError(insertRes.error)) {
      missingStatusCol = true;
      console.warn(
        "[API categories POST] Coluna 'status' ausente no schema Supabase (PGRST204/42703). Para suporte completo aos 3 estados, aplique a migração 005_category_subcategory_publication_status.sql. Salvando com 'published'."
      );
      const { status: _omitted, ...fallbackPayload } = dbPayload;
      insertRes = await getSupabaseAdmin()
        .from("categories")
        .insert(fallbackPayload)
        .select("*")
        .single();
    }

    if (insertRes.error) {
      console.error("[API categories POST] Erro de banco:", {
        code: insertRes.error.code,
        message: insertRes.error.message,
        details: insertRes.error.details,
      });
      return NextResponse.json({ error: getErrorMessage(insertRes.error) }, { status: 500 });
    }

    const savedCategory = mapDbToCategory(insertRes.data);
    return NextResponse.json({
      success: true,
      category: savedCategory,
      needsMigration: missingStatusCol && status === "updating",
    });
  } catch (err: unknown) {
    console.error("[API categories POST] Exceção:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// PUT: Atualiza uma categoria ou lote de categorias no Supabase (admin apenas)
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  try {
    const body = await request.json();

    if (Array.isArray(body)) {
      const rows = body.map((cat: Category) => {
        const s = cat.status || (cat.published === false ? "hidden" : "available");
        return mapCategoryToDb({ ...cat, status: s });
      });

      let upsertRes = await getSupabaseAdmin()
        .from("categories")
        .upsert(rows)
        .select("*");

      let missingStatusCol = false;
      if (upsertRes.error && isMissingStatusColumnError(upsertRes.error)) {
        missingStatusCol = true;
        console.warn(
          "[API categories PUT batch] Coluna 'status' ausente no schema Supabase. Executando fallback seguro com 'published'."
        );
        const fallbackRows = rows.map((r) => {
          const { status: _omitted, ...rest } = r;
          return rest;
        });
        upsertRes = await getSupabaseAdmin()
          .from("categories")
          .upsert(fallbackRows)
          .select("*");
      }

      if (upsertRes.error) {
        console.error("[API categories PUT batch] Erro de banco:", {
          code: upsertRes.error.code,
          message: upsertRes.error.message,
          details: upsertRes.error.details,
        });
        return NextResponse.json({ error: getErrorMessage(upsertRes.error) }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        categories: (upsertRes.data || []).map(mapDbToCategory),
        needsMigration: missingStatusCol,
      });
    }

    const cat: Category = body;
    const status: PublicationStatus = cat.status || (cat.published === false ? "hidden" : "available");
    const dbPayload = mapCategoryToDb({ ...cat, status });

    let upsertRes = await getSupabaseAdmin()
      .from("categories")
      .upsert(dbPayload)
      .select("*")
      .single();

    let missingStatusCol = false;
    if (upsertRes.error && isMissingStatusColumnError(upsertRes.error)) {
      missingStatusCol = true;
      console.warn(
        `[API categories PUT] Coluna 'status' ausente no schema Supabase ao salvar categoria "${cat.name}". Executando fallback persistente com 'published'.`
      );
      const { status: _omitted, ...fallbackPayload } = dbPayload;
      upsertRes = await getSupabaseAdmin()
        .from("categories")
        .upsert(fallbackPayload)
        .select("*")
        .single();
    }

    if (upsertRes.error) {
      console.error("[API categories PUT] Erro de banco:", {
        code: upsertRes.error.code,
        message: upsertRes.error.message,
        details: upsertRes.error.details,
      });
      return NextResponse.json({ error: getErrorMessage(upsertRes.error) }, { status: 500 });
    }

    const savedCategory = mapDbToCategory(upsertRes.data);
    return NextResponse.json({
      success: true,
      category: savedCategory,
      needsMigration: missingStatusCol && status === "updating",
    });
  } catch (err: unknown) {
    console.error("[API categories PUT] Exceção:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// DELETE: Exclui uma categoria pelo ID (query param ?id=...)
export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID da categoria obrigatório." }, { status: 400 });

  try {
    const { error } = await getSupabaseAdmin().from("categories").delete().eq("id", id);
    if (error) {
      console.error("[API categories DELETE] Erro ao deletar categoria:", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error("[API categories DELETE] Exceção:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
