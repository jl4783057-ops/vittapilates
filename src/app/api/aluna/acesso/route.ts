import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getStudentAccess, getUserFromBearer } from "@/lib/access";

// Server-side source of truth for whether the logged-in student may enter /aluna.
export async function GET(request: Request) {
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  let user = await getUserFromBearer(request);
  if (!user) {
    try {
      const { createClientServer } = await import("@/lib/supabase/server");
      const supabaseServer = await createClientServer();
      const { data: { user: cookieUser } } = await supabaseServer.auth.getUser();
      user = cookieUser;
    } catch {
      // Cookie reading fallback failed
    }
  }

  if (!user) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  const { hasAccess, profile } = await getStudentAccess(user.id);
  return NextResponse.json({ hasAccess, profile }, { status: hasAccess ? 200 : 403 });
}
