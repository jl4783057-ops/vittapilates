import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/access";
import { Category, PublicationStatus } from "@/types";
import { INITIAL_CATEGORIES } from "@/lib/data/initial-data";
import { getStatusOverride, setStatusOverride, deleteStatusOverride } from "@/lib/data/publication-status-store";

export function mapDbToCategory(row: Record<string, unknown>): Category {
  const rowId = String(row.id);
  const rawStatus = typeof row.status === "string" ? row.status.trim().toLowerCase() : "";
  const override = getStatusOverride("categories", rowId);

  let status: PublicationStatus = "available";
  if (rawStatus === "available" || rawStatus === "updating" || rawStatus === "hidden") {
    status = rawStatus as PublicationStatus;
  } else if (override) {
    status = override;
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

// GET: Retorna todas as categorias compartilhadas do Supabase
export async function GET() {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ configured: false, categories: INITIAL_CATEGORIES }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("categories")
      .select("*")
      .order("display_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ configured: true, categories: INITIAL_CATEGORIES }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ configured: true, categories: data.map(mapDbToCategory) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Erro ao listar categorias:", err);
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

    // Se o banco ainda não rodou a migration da coluna status (código 42703)
    if (insertRes.error && insertRes.error.code === "42703") {
      const { status: _omitted, ...fallbackPayload } = dbPayload;
      setStatusOverride("categories", String(body.id), status);
      insertRes = await getSupabaseAdmin()
        .from("categories")
        .insert(fallbackPayload)
        .select("*")
        .single();
    } else if (!insertRes.error) {
      setStatusOverride("categories", String(body.id), status);
    }

    if (insertRes.error) throw insertRes.error;
    return NextResponse.json({ success: true, category: mapDbToCategory(insertRes.data) });
  } catch (err: unknown) {
    console.error("Erro ao criar categoria:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao salvar categoria no banco." },
      { status: 500 }
    );
  }
}

// PUT: Atualiza ou cria em lote uma categoria (admin apenas)
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  try {
    const body = await request.json();
    if (Array.isArray(body)) {
      // Inserção/atualização em lote (ex: sync inicial de fábrica)
      const rows = body.map((cat: Category) => {
        const s = cat.status || (cat.published === false ? "hidden" : "available");
        setStatusOverride("categories", String(cat.id), s);
        return mapCategoryToDb({ ...cat, status: s });
      });

      let upsertRes = await getSupabaseAdmin()
        .from("categories")
        .upsert(rows)
        .select("*");

      if (upsertRes.error && upsertRes.error.code === "42703") {
        const fallbackRows = rows.map((r) => {
          const { status: _omitted, ...rest } = r;
          return rest;
        });
        upsertRes = await getSupabaseAdmin()
          .from("categories")
          .upsert(fallbackRows)
          .select("*");
      }

      if (upsertRes.error) throw upsertRes.error;
      return NextResponse.json({ success: true, categories: (upsertRes.data || []).map(mapDbToCategory) });
    }

    const cat: Category = body;
    const status: PublicationStatus = cat.status || (cat.published === false ? "hidden" : "available");
    const dbPayload = mapCategoryToDb({ ...cat, status });

    let upsertRes = await getSupabaseAdmin()
      .from("categories")
      .upsert(dbPayload)
      .select("*")
      .single();

    if (upsertRes.error && upsertRes.error.code === "42703") {
      const { status: _omitted, ...fallbackPayload } = dbPayload;
      setStatusOverride("categories", String(cat.id), status);
      upsertRes = await getSupabaseAdmin()
        .from("categories")
        .upsert(fallbackPayload)
        .select("*")
        .single();
    } else if (!upsertRes.error) {
      setStatusOverride("categories", String(cat.id), status);
    }

    if (upsertRes.error) throw upsertRes.error;
    return NextResponse.json({ success: true, category: mapDbToCategory(upsertRes.data) });
  } catch (err: unknown) {
    console.error("Erro ao atualizar categoria:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao atualizar categoria no banco." },
      { status: 500 }
    );
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
    deleteStatusOverride("categories", id);
    const { error } = await getSupabaseAdmin().from("categories").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error("Erro ao deletar categoria:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao excluir categoria no banco." },
      { status: 500 }
    );
  }
}
