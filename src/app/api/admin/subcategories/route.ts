import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/access";
import { Subcategory, PublicationStatus } from "@/types";
import { INITIAL_SUBCATEGORIES } from "@/lib/data/initial-data";
import { getStatusOverride, setStatusOverride, deleteStatusOverride } from "@/lib/data/publication-status-store";

export function mapDbToSubcategory(row: Record<string, unknown>): Subcategory {
  const rowId = String(row.id);
  const rawStatus = typeof row.status === "string" ? row.status.trim().toLowerCase() : "";
  const override = getStatusOverride("subcategories", rowId);

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

    if (error) {
      console.error("Erro ao listar subcategorias do Supabase:", error.message);
      return NextResponse.json({ configured: true, subcategories: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ configured: true, subcategories: (data || []).map(mapDbToSubcategory) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Erro ao listar subcategorias:", err);
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

    if (insertRes.error && insertRes.error.code === "42703") {
      const { status: _omitted, ...fallbackPayload } = dbPayload;
      setStatusOverride("subcategories", String(body.id), status);
      insertRes = await getSupabaseAdmin()
        .from("subcategories")
        .insert(fallbackPayload)
        .select("*")
        .single();
    } else if (!insertRes.error) {
      setStatusOverride("subcategories", String(body.id), status);
    }

    if (insertRes.error) throw insertRes.error;
    return NextResponse.json({ success: true, subcategory: mapDbToSubcategory(insertRes.data) });
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
      const rows = body.map((sub: Subcategory) => {
        const s = sub.status || (sub.published === false ? "hidden" : "available");
        setStatusOverride("subcategories", String(sub.id), s);
        return mapSubcategoryToDb({ ...sub, status: s });
      });

      let upsertRes = await getSupabaseAdmin()
        .from("subcategories")
        .upsert(rows)
        .select("*");

      if (upsertRes.error && upsertRes.error.code === "42703") {
        const fallbackRows = rows.map((r) => {
          const { status: _omitted, ...rest } = r;
          return rest;
        });
        upsertRes = await getSupabaseAdmin()
          .from("subcategories")
          .upsert(fallbackRows)
          .select("*");
      }

      if (upsertRes.error) throw upsertRes.error;
      return NextResponse.json({ success: true, subcategories: (upsertRes.data || []).map(mapDbToSubcategory) });
    }

    const sub: Subcategory = body;
    const status: PublicationStatus = sub.status || (sub.published === false ? "hidden" : "available");
    const dbPayload = mapSubcategoryToDb({ ...sub, status });

    let upsertRes = await getSupabaseAdmin()
      .from("subcategories")
      .upsert(dbPayload)
      .select("*")
      .single();

    if (upsertRes.error && upsertRes.error.code === "42703") {
      const { status: _omitted, ...fallbackPayload } = dbPayload;
      setStatusOverride("subcategories", String(sub.id), status);
      upsertRes = await getSupabaseAdmin()
        .from("subcategories")
        .upsert(fallbackPayload)
        .select("*")
        .single();
    } else if (!upsertRes.error) {
      setStatusOverride("subcategories", String(sub.id), status);
    }

    if (upsertRes.error) throw upsertRes.error;
    return NextResponse.json({ success: true, subcategory: mapDbToSubcategory(upsertRes.data) });
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
    deleteStatusOverride("subcategories", id);
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
