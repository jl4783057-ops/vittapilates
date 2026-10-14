import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/access";

// Logo is global (same for every student), so it lives in site_settings, not in the browser.
export async function GET() {
  if (!isSupabaseAdminConfigured) return NextResponse.json({ configured: false });
  const { data } = await getSupabaseAdmin().from("site_settings").select("logo_url").eq("id", 1).maybeSingle();
  return NextResponse.json(
    { configured: true, logoUrl: data?.logo_url ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return NextResponse.json({ configured: false });

  const body = await request.json().catch(() => ({}));
  const logoUrl = body.logoUrl ? String(body.logoUrl) : null;
  if (logoUrl && !/^(https:\/\/|\/)/.test(logoUrl)) {
    return NextResponse.json({ error: "Endereço de logo inválido." }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("site_settings")
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ configured: true, logoUrl });
}
