import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/access";
import { Category } from "@/types";
import { INITIAL_CATEGORIES } from "@/lib/data/initial-data";

export function mapDbToCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: typeof row.description === "string" ? row.description : "",
    bannerUrl: typeof row.banner_url === "string" ? row.banner_url : undefined,
    order: Number(row.display_order ?? 0),
    published: Boolean(row.published ?? true),
  };
}

export function mapCategoryToDb(cat: Category): Record<string, unknown> {
  return {
    id: cat.id,
    slug: cat.slug,
    name: cat.name,
    description: cat.description || null,
    banner_url: cat.bannerUrl || null,
    display_order: cat.order,
    published: cat.published,
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
    const dbPayload = mapCategoryToDb(body);

    const { data, error } = await getSupabaseAdmin()
      .from("categories")
      .insert(dbPayload)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, category: mapDbToCategory(data) });
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
      const rows = body.map(mapCategoryToDb);
      const { data, error } = await getSupabaseAdmin()
        .from("categories")
        .upsert(rows)
        .select("*");
      if (error) throw error;
      return NextResponse.json({ success: true, categories: (data || []).map(mapDbToCategory) });
    }

    const cat: Category = body;
    const dbPayload = mapCategoryToDb(cat);
    const { data, error } = await getSupabaseAdmin()
      .from("categories")
      .upsert(dbPayload)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, category: mapDbToCategory(data) });
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
