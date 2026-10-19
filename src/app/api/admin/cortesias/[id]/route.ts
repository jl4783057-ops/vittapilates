import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  applyCourtesyToProfile,
  ensureAccountAndSendPasswordLink,
  isAdminRequest,
  siteUrl,
} from "@/lib/access";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const admin = getSupabaseAdmin();

  const { data: grant } = await admin.from("courtesy_grants").select("*").eq("id", id).maybeSingle();
  if (!grant) return NextResponse.json({ error: "Cortesia não encontrada." }, { status: 404 });

  const now = new Date();

  try {
    if (action === "renew") {
      const days = Number(body.days);
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        return NextResponse.json({ error: "Informe de 1 a 365 dias." }, { status: 400 });
      }
      // Still valid: extend from the current expiry. Expired/revoked: restart from today.
      const base = new Date(grant.expires_at) > now && ["invited", "active"].includes(grant.status)
        ? new Date(grant.expires_at)
        : now;
      const expiresAt = new Date(base.getTime() + days * 86_400_000).toISOString();
      const restarted = base === now;

      const profileAccess = grant.user_id ? await applyCourtesyToProfile(grant.user_id, expiresAt) : "courtesy";
      let status = profileAccess === "subscriber" ? "converted" : grant.status;
      if (status !== "converted") {
        const { data: u } = grant.user_id ? await admin.auth.admin.getUserById(grant.user_id) : { data: null };
        status = u?.user?.last_sign_in_at ? "active" : "invited";
      }

      const { data, error } = await admin
        .from("courtesy_grants")
        .update({
          status,
          expires_at: expiresAt,
          starts_at: restarted ? now.toISOString() : grant.starts_at,
          duration_days: restarted ? days : grant.duration_days + days,
          updated_at: now.toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ grant: data });
    }

    if (action === "revoke") {
      if (grant.user_id) {
        await admin
          .from("profiles")
          .update({ access_type: "none", subscription_status: "inactive", access_expires_at: null })
          .eq("id", grant.user_id)
          .eq("access_type", "courtesy");
      }
      const { data, error } = await admin
        .from("courtesy_grants")
        .update({ status: "revoked", updated_at: now.toISOString() })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ grant: data });
    }

    if (action === "resend") {
      await ensureAccountAndSendPasswordLink({
        email: grant.email,
        name: grant.name,
        redirectTo: `${siteUrl(request)}/definir-senha`,
        forceEmail: true,
      });
      const { data, error } = await admin
        .from("courtesy_grants")
        .update({ invite_sent_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ grant: data });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    console.error("[cortesias/[id] PATCH] Exceção:", err);
    return NextResponse.json({ error: "Falha ao atualizar dados da cortesia." }, { status: 500 });
  }
}
