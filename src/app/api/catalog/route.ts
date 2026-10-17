import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { INITIAL_SETTINGS, INITIAL_CATEGORIES, INITIAL_SUBCATEGORIES } from "@/lib/data/initial-data";
import { mapDbToSiteSettings } from "@/app/api/admin/settings/route";
import { mapDbToCategory } from "@/app/api/admin/categories/route";
import { mapDbToSubcategory } from "@/app/api/admin/subcategories/route";
import { mapDbToExercise } from "@/app/api/admin/exercises/route";
import { Category, Subcategory, Exercise, PublicationStatus } from "@/types";

// Endpoint público compartilhado para carregar configurações visuais, categorias, subcategorias e exercícios
// Nunca expõe aulas completas ou links de vídeos (video_url) para usuários não autenticados/sem acesso.
export async function GET() {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({
      configured: false,
      siteSettings: INITIAL_SETTINGS,
      categories: INITIAL_CATEGORIES,
      subcategories: INITIAL_SUBCATEGORIES,
      exercises: [],
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const admin = getSupabaseAdmin();

    const [settingsRes, categoriesRes, subcategoriesRes, exercisesRes] = await Promise.all([
      admin.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      admin.from("categories").select("*").order("display_order", { ascending: true }),
      admin.from("subcategories").select("*").order("display_order", { ascending: true }),
      admin.from("exercises").select("*").order("display_order", { ascending: true }),
    ]);

    const siteSettings = settingsRes.data ? mapDbToSiteSettings(settingsRes.data) : INITIAL_SETTINGS;
    const rawCategories: Category[] = categoriesRes.data && categoriesRes.data.length > 0
      ? categoriesRes.data.map(mapDbToCategory)
      : INITIAL_CATEGORIES;
    const rawSubcategories: Subcategory[] = subcategoriesRes.data && subcategoriesRes.data.length > 0
      ? subcategoriesRes.data.map(mapDbToSubcategory)
      : INITIAL_SUBCATEGORIES;
    const rawExercises: Exercise[] = exercisesRes.data && exercisesRes.data.length > 0
      ? exercisesRes.data.map(mapDbToExercise)
      : [];

    // Mapa de categorias pai para calcular herança de status
    const categoryMap = new Map<string, Category>(rawCategories.map((c) => [c.id, c]));

    // Aplicação da regra da categoria pai às subcategorias:
    // - Se categoria pai for 'hidden', a subcategoria fica 'hidden'.
    // - Se categoria pai for 'updating', a subcategoria fica no mínimo 'updating' (a menos que já seja 'hidden').
    // - Se categoria pai for 'available', a subcategoria mantém seu próprio status.
    const subcategories: Subcategory[] = rawSubcategories.map((sub) => {
      const parent = categoryMap.get(sub.categoryId);
      let effectiveStatus: PublicationStatus = sub.status;

      if (!parent || parent.status === "hidden") {
        effectiveStatus = "hidden";
      } else if (parent.status === "updating") {
        effectiveStatus = sub.status === "hidden" ? "hidden" : "updating";
      } else {
        effectiveStatus = sub.status;
      }

      return {
        ...sub,
        status: effectiveStatus,
        published: effectiveStatus !== "hidden",
      };
    });

    // 2. Filtro de visibilidade para exercícios:
    // Garante que alunas nunca recebam exercícios de categorias ou subcategorias 'hidden'
    const subcategoryMap = new Map<string, Subcategory>(subcategories.map((s) => [s.id, s]));
    const visibleExercises = rawExercises.filter((ex) => {
      const sub = subcategoryMap.get(ex.subcategoryId);
      if (!sub || sub.status === "hidden") return false;
      const cat = categoryMap.get(ex.categoryId);
      if (!cat || cat.status === "hidden") return false;
      return true;
    });

    return NextResponse.json({
      configured: true,
      siteSettings,
      categories: rawCategories,
      subcategories,
      exercises: visibleExercises,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Erro ao sincronizar dados compartilhados do Supabase:", err);
    return NextResponse.json({
      configured: false,
      siteSettings: INITIAL_SETTINGS,
      categories: INITIAL_CATEGORIES,
      subcategories: INITIAL_SUBCATEGORIES,
      exercises: [],
    }, { headers: { "Cache-Control": "no-store" } });
  }
}
