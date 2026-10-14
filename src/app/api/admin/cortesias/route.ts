import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  applyCourtesyToProfile,
  ensureAccountAndSendPasswordLink,
  expireCourtesies,
  isAdminRequest,
  normalizeEmail,
  siteUrl,
} from "@/lib/access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const notConfigured = () =>
  NextResponse.json(
    { error: "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY." },
    { status: 503 }
  );

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return notConfigured();

  await expireCourtesies();
  const { data, error } = await getSupabaseAdmin()
    .from("courtesy_grants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ grants: data });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!isSupabaseAdminConfigured) return notConfigured();

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = normalizeEmail(String(body.email ?? ""));
  const durationDays = Number(body.durationDays);
  const notes = body.notes ? String(body.notes).slice(0, 500) : null;

  if (name.length < 2) return NextResponse.json({ error: "Informe o nome da influenciadora." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) {
    return NextResponse.json({ error: "A duração deve ser entre 1 e 365 dias." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: openGrant } = await admin
    .from("courtesy_grants")
    .select("id")
    .eq("email", email)
    .in("status", ["invited", "active"])
    .maybeSingle();
  if (openGrant) {
    return NextResponse.json({ error: "Já existe uma cortesia ativa para este e-mail. Use “Renovar”." }, { status: 409 });
  }

  try {
    const account = await ensureAccountAndSendPasswordLink({
      email,
      name,
      redirectTo: `${siteUrl(request)}/definir-senha`,
      forceEmail: true,
    });

    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + durationDays * 86_400_000);
    const profileAccess = await applyCourtesyToProfile(account.userId, expiresAt.toISOString());

    const { data: grant, error } = await admin
      .from("courtesy_grants")
      .insert({
        user_id: account.userId,
        name,
        email,
        duration_days: durationDays,
        status: profileAccess === "subscriber" ? "converted" : "invited",
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        invite_sent_at: account.emailSent ? startsAt.toISOString() : null,
        created_by: "admin",
        notes,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ grant }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
