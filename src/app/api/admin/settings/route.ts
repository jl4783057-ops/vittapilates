import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/access";
import { SiteSettings } from "@/types";
import { INITIAL_SETTINGS } from "@/lib/data/initial-data";

// Helper para converter linha da tabela site_settings para o tipo SiteSettings
export function mapDbToSiteSettings(row: Record<string, unknown> | null | undefined): SiteSettings {
  if (!row) return INITIAL_SETTINGS;
  return {
    platformName: typeof row.platform_name === "string" ? row.platform_name : INITIAL_SETTINGS.platformName,
    logoText: typeof row.logo_text === "string" ? row.logo_text : INITIAL_SETTINGS.logoText,
    logoUrl: typeof row.logo_url === "string" ? row.logo_url : undefined,
    loginTitle: typeof row.login_title === "string" ? row.login_title : INITIAL_SETTINGS.loginTitle,
    loginSubtitle: typeof row.login_subtitle === "string" ? row.login_subtitle : INITIAL_SETTINGS.loginSubtitle,
    loginBannerUrl: typeof row.login_banner_url === "string" ? row.login_banner_url : undefined,
    whatsappCommunityUrl: typeof row.whatsapp_community_url === "string" ? row.whatsapp_community_url : INITIAL_SETTINGS.whatsappCommunityUrl,
    whatsappCommunityTitle: typeof row.whatsapp_community_title === "string" ? row.whatsapp_community_title : INITIAL_SETTINGS.whatsappCommunityTitle,
    whatsappCommunitySubtitle: typeof row.whatsapp_community_subtitle === "string" ? row.whatsapp_community_subtitle : INITIAL_SETTINGS.whatsappCommunitySubtitle,
    whatsappCommunityButtonText: typeof row.whatsapp_community_button_text === "string" ? row.whatsapp_community_button_text : INITIAL_SETTINGS.whatsappCommunityButtonText,
    libraryHeroTitle: typeof row.library_hero_title === "string" ? row.library_hero_title : INITIAL_SETTINGS.libraryHeroTitle,
    libraryHeroSubtitle: typeof row.library_hero_subtitle === "string" ? row.library_hero_subtitle : INITIAL_SETTINGS.libraryHeroSubtitle,
  };
}

// GET: Retorna as configurações compartilhadas de site_settings
export async function GET() {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ configured: false, settings: INITIAL_SETTINGS }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ configured: true, settings: INITIAL_SETTINGS }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ configured: true, settings: mapDbToSiteSettings(data) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Erro ao buscar site_settings:", err);
    return NextResponse.json({ configured: false, settings: INITIAL_SETTINGS }, { headers: { "Cache-Control": "no-store" } });
  }
}

// PUT: Atualiza as configurações no Supabase (apenas admin autenticado)
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 503 });
  }

  try {
    const body: Partial<SiteSettings> = await request.json();

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.platformName !== undefined) updatePayload.platform_name = body.platformName;
    if (body.logoText !== undefined) updatePayload.logo_text = body.logoText;
    if (body.logoUrl !== undefined) updatePayload.logo_url = body.logoUrl || null;
    if (body.loginTitle !== undefined) updatePayload.login_title = body.loginTitle;
    if (body.loginSubtitle !== undefined) updatePayload.login_subtitle = body.loginSubtitle;
    if (body.loginBannerUrl !== undefined) updatePayload.login_banner_url = body.loginBannerUrl || null;
    if (body.whatsappCommunityUrl !== undefined) updatePayload.whatsapp_community_url = body.whatsappCommunityUrl;
    if (body.whatsappCommunityTitle !== undefined) updatePayload.whatsapp_community_title = body.whatsappCommunityTitle;
    if (body.whatsappCommunitySubtitle !== undefined) updatePayload.whatsapp_community_subtitle = body.whatsappCommunitySubtitle;
    if (body.whatsappCommunityButtonText !== undefined) updatePayload.whatsapp_community_button_text = body.whatsappCommunityButtonText;
    if (body.libraryHeroTitle !== undefined) updatePayload.library_hero_title = body.libraryHeroTitle;
    if (body.libraryHeroSubtitle !== undefined) updatePayload.library_hero_subtitle = body.libraryHeroSubtitle;

    const { data, error } = await getSupabaseAdmin()
      .from("site_settings")
      .upsert({ id: 1, ...updatePayload })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      settings: mapDbToSiteSettings(data),
    });
  } catch (err: unknown) {
    console.error("Erro ao atualizar site_settings no Supabase:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao atualizar configurações." },
      { status: 500 }
    );
  }
}
