import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/access";
import { Subcategory, PublicationStatus } from "@/types";
import { INITIAL_SUBCATEGORIES } from "@/lib/data/initial-data";

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
    message.includes("column subcategories.status does not exist")
  );
}

function getErrorMessage(err: unknown): string {
  if (!err) return "Erro desconhecido ao processar subcategoria.";
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string" && e.message) return e.message;
    if (typeof e.details === "string" && e.details) return e.details;
    if (typeof e.hint === "string" && e.hint) return e.hint;
  }
  return String(err);
}

export function mapDbToSubcategory(row: Record<string, unknown>): Subcategory {
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
    categoryId: String(row.category_id),
    slug: String(row.slug),
    name: String(row.name),
    description: typeof row.description === "string" ? row.description : undefined,
    imageUrl: typeof row.image_url === "string" ? row.image_url : undefined,
    order: Number(row.display_order ?? 0),
    published: status !== "hidden",
    status,
  };
}

export function mapSubcategoryToDb(sub: Subcategory): Record<string, unknown> {
  const status: PublicationStatus = sub.status || (sub.published === false ? "hidden" : "available");
  return {
    id: sub.id,
    category_id: sub.categoryId,
    slug: sub.slug,
    name: sub.name,
    description: sub.description || null,
    image_url: sub.imageUrl || null,
    display_order: sub.order,
    published: status !== "hidden",
    status,
  };
}

// GET: Retorna todas as subcategorias do Supabase
export async function GET() {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ configured: false, subcategories: INITIAL_SUBCATEGORIES }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("subcategories")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("[API subcategories GET] Erro ao listar subcategorias:", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return NextResponse.json({ configured: true, subcategories: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ configured: true, subcategories: (data || []).map(mapDbToSubcategory) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[API subcategories GET] Exceção inesperada:", err);
    return NextResponse.json({ configured: false, subcategories: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}

// POST: Cria uma nova subcategoria no Supabase (admin apenas)
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  try {
    const body: Subcategory = await request.json();
    const status: PublicationStatus = body.status || (body.published === false ? "hidden" : "available");
    const dbPayload = mapSubcategoryToDb({ ...body, status });

    let insertRes = await getSupabaseAdmin()
      .from("subcategories")
      .insert(dbPayload)
      .select("*")
      .single();

    let missingStatusCol = false;
    if (insertRes.error && isMissingStatusColumnError(insertRes.error)) {
      missingStatusCol = true;
      console.warn(
        "[API subcategories POST] Coluna 'status' ausente no schema Supabase (PGRST204/42703). Para suporte completo aos 3 estados, aplique a migração 005_category_subcategory_publication_status.sql. Salvando com 'published'."
      );
      const { status: _omitted, ...fallbackPayload } = dbPayload;
      insertRes = await getSupabaseAdmin()
        .from("subcategories")
        .insert(fallbackPayload)
        .select("*")
        .single();
    }

    if (insertRes.error) {
      console.error("[API subcategories POST] Erro de banco:", {
        code: insertRes.error.code,
        message: insertRes.error.message,
        details: insertRes.error.details,
      });
      return NextResponse.json({ error: getErrorMessage(insertRes.error) }, { status: 500 });
    }

    const savedSubcategory = mapDbToSubcategory(insertRes.data);
    return NextResponse.json({
      success: true,
      subcategory: savedSubcategory,
      needsMigration: missingStatusCol && status === "updating",
    });
  } catch (err: unknown) {
    console.error("[API subcategories POST] Exceção:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// PUT: Atualiza uma subcategoria ou lote de subcategorias no Supabase (admin apenas)
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  try {
    const body = await request.json();

    if (Array.isArray(body)) {
      const rows = body.map((sub: Subcategory) => {
        const s = sub.status || (sub.published === false ? "hidden" : "available");
        return mapSubcategoryToDb({ ...sub, status: s });
      });

      let upsertRes = await getSupabaseAdmin()
        .from("subcategories")
        .upsert(rows)
        .select("*");

      let missingStatusCol = false;
      if (upsertRes.error && isMissingStatusColumnError(upsertRes.error)) {
        missingStatusCol = true;
        console.warn(
          "[API subcategories PUT batch] Coluna 'status' ausente no schema Supabase. Executando fallback seguro com 'published'."
        );
        const fallbackRows = rows.map((r) => {
          const { status: _omitted, ...rest } = r;
          return rest;
        });
        upsertRes = await getSupabaseAdmin()
          .from("subcategories")
          .upsert(fallbackRows)
          .select("*");
      }

      if (upsertRes.error) {
        console.error("[API subcategories PUT batch] Erro de banco:", {
          code: upsertRes.error.code,
          message: upsertRes.error.message,
          details: upsertRes.error.details,
        });
        return NextResponse.json({ error: getErrorMessage(upsertRes.error) }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        subcategories: (upsertRes.data || []).map(mapDbToSubcategory),
        needsMigration: missingStatusCol,
      });
    }

    const sub: Subcategory = body;
    const status: PublicationStatus = sub.status || (sub.published === false ? "hidden" : "available");
    const dbPayload = mapSubcategoryToDb({ ...sub, status });

    let upsertRes = await getSupabaseAdmin()
      .from("subcategories")
      .upsert(dbPayload)
      .select("*")
      .single();

    let missingStatusCol = false;
    if (upsertRes.error && isMissingStatusColumnError(upsertRes.error)) {
      missingStatusCol = true;
      console.warn(
        `[API subcategories PUT] Coluna 'status' ausente no schema Supabase ao salvar subcategoria "${sub.name}". Executando fallback persistente com 'published'.`
      );
      const { status: _omitted, ...fallbackPayload } = dbPayload;
      upsertRes = await getSupabaseAdmin()
        .from("subcategories")
        .upsert(fallbackPayload)
        .select("*")
        .single();
    }

    if (upsertRes.error) {
      console.error("[API subcategories PUT] Erro de banco:", {
        code: upsertRes.error.code,
        message: upsertRes.error.message,
        details: upsertRes.error.details,
      });
      return NextResponse.json({ error: getErrorMessage(upsertRes.error) }, { status: 500 });
    }

    const savedSubcategory = mapDbToSubcategory(upsertRes.data);
    return NextResponse.json({
      success: true,
      subcategory: savedSubcategory,
      needsMigration: missingStatusCol && status === "updating",
    });
  } catch (err: unknown) {
    console.error("[API subcategories PUT] Exceção:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// DELETE: Exclui uma subcategoria pelo ID (query param ?id=...)
export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID da subcategoria obrigatório." }, { status: 400 });

  try {
    const { error } = await getSupabaseAdmin().from("subcategories").delete().eq("id", id);
    if (error) {
      console.error("[API subcategories DELETE] Erro ao deletar subcategoria:", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error("[API subcategories DELETE] Exceção:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
