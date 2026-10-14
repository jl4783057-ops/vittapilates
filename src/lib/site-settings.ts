import "server-only";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { mapDbToSiteSettings } from "@/app/api/admin/settings/route";
import { INITIAL_SETTINGS } from "@/lib/data/initial-data";
import type { SiteSettings } from "@/types";

/** Reads the single shared settings row (id = 1) directly from Supabase on every request. */
export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isSupabaseAdminConfigured) return INITIAL_SETTINGS;
  const { data, error } = await getSupabaseAdmin()
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.error("Erro ao ler site_settings:", error.message);
    return INITIAL_SETTINGS;
  }
  return mapDbToSiteSettings(data);
}
