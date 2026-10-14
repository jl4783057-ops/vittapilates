import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/access";
import { Subcategory } from "@/types";
import { INITIAL_SUBCATEGORIES } from "@/lib/data/initial-data";

export function mapDbToSubcategory(row: Record<string, unknown>): Subcategory {
  return {
    id: String(row.id),
    categoryId: String(row.category_id),
    slug: String(row.slug),
    name: String(row.name),
    description: typeof row.description === "string" ? row.description : undefined,
    imageUrl: typeof row.image_url === "string" ? row.image_url : undefined,
    order: Number(row.display_order ?? 0),
    published: Boolean(row.published ?? true),
  };
}

export function mapSubcategoryToDb(sub: Subcategory): Record<string, unknown> {
  return {
    id: sub.id,
    category_id: sub.categoryId,
    slug: sub.slug,
    name: sub.name,
    description: sub.description || null,
    image_url: sub.imageUrl || null,
    display_order: sub.order,
    published: sub.published,
  };
}

// GET: Retorna todas as subcategorias compartilhadas do Supabase
export async function GET() {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ configured: false, subcategories: INITIAL_SUBCATEGORIES }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("subcategories")
      .select("*")
      .order("display_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ configured: true, subcategories: INITIAL_SUBCATEGORIES }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ configured: true, subcategories: data.map(mapDbToSubcategory) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Erro ao listar subcategorias:", err);
    return NextResponse.json({ configured: false, subcategories: INITIAL_SUBCATEGORIES }, { headers: { "Cache-Control": "no-store" } });
  }
}

// POST: Cria uma nova subcategoria no Supabase (admin apenas)
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  try {
    const body: Subcategory = await request.json();
    const dbPayload = mapSubcategoryToDb(body);

    const { data, error } = await getSupabaseAdmin()
      .from("subcategories")
      .insert(dbPayload)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, subcategory: mapDbToSubcategory(data) });
  } catch (err: unknown) {
    console.error("Erro ao criar subcategoria:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao salvar subcategoria no banco." },
      { status: 500 }
    );
  }
}

// PUT: Atualiza ou cria em lote uma subcategoria (admin apenas)
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  try {
    const body = await request.json();
    if (Array.isArray(body)) {
      const rows = body.map(mapSubcategoryToDb);
      const { data, error } = await getSupabaseAdmin()
        .from("subcategories")
        .upsert(rows)
        .select("*");
      if (error) throw error;
      return NextResponse.json({ success: true, subcategories: (data || []).map(mapDbToSubcategory) });
    }

    const sub: Subcategory = body;
    const dbPayload = mapSubcategoryToDb(sub);
    const { data, error } = await getSupabaseAdmin()
      .from("subcategories")
      .upsert(dbPayload)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, subcategory: mapDbToSubcategory(data) });
  } catch (err: unknown) {
    console.error("Erro ao atualizar subcategoria:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao atualizar subcategoria no banco." },
      { status: 500 }
    );
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
    if (error) throw error;
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error("Erro ao deletar subcategoria:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao excluir subcategoria no banco." },
      { status: 500 }
    );
  }
}
