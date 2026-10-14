import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { INITIAL_SETTINGS, INITIAL_CATEGORIES, INITIAL_SUBCATEGORIES, INITIAL_LESSONS } from "@/lib/data/initial-data";
import { mapDbToSiteSettings } from "@/app/api/admin/settings/route";
import { mapDbToCategory } from "@/app/api/admin/categories/route";
import { mapDbToSubcategory } from "@/app/api/admin/subcategories/route";

// Endpoint público compartilhado para carregar configurações visuais, categorias e subcategorias
// Nunca expõe aulas completas ou links de vídeos (video_url) para usuários não autenticados/sem acesso.
export async function GET() {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({
      configured: false,
      siteSettings: INITIAL_SETTINGS,
      categories: INITIAL_CATEGORIES,
      subcategories: INITIAL_SUBCATEGORIES,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const admin = getSupabaseAdmin();

    const [settingsRes, categoriesRes, subcategoriesRes] = await Promise.all([
      admin.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      admin.from("categories").select("*").eq("published", true).order("display_order", { ascending: true }),
      admin.from("subcategories").select("*").eq("published", true).order("display_order", { ascending: true }),
    ]);

    const siteSettings = settingsRes.data ? mapDbToSiteSettings(settingsRes.data) : INITIAL_SETTINGS;
    const categories = categoriesRes.data && categoriesRes.data.length > 0
      ? categoriesRes.data.map(mapDbToCategory)
      : INITIAL_CATEGORIES.filter((c) => c.published);
    const subcategories = subcategoriesRes.data && subcategoriesRes.data.length > 0
      ? subcategoriesRes.data.map(mapDbToSubcategory)
      : INITIAL_SUBCATEGORIES.filter((s) => s.published);

    return NextResponse.json({
      configured: true,
      siteSettings,
      categories,
      subcategories,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Erro ao sincronizar dados compartilhados do Supabase:", err);
    return NextResponse.json({
      configured: false,
      siteSettings: INITIAL_SETTINGS,
      categories: INITIAL_CATEGORIES,
      subcategories: INITIAL_SUBCATEGORIES,
    }, { headers: { "Cache-Control": "no-store" } });
  }
}
