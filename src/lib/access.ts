import "server-only";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import { getSupabaseAdmin, getSupabaseAnonServer } from "@/lib/supabase/admin";

export type AccessType = "none" | "subscriber" | "courtesy";

export function isAdminRequest(request: NextRequest) {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

/** Validates a Supabase access token (Authorization: Bearer ...) and returns the user. */
export async function getUserFromBearer(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  return error ? null : data.user;
}

export function siteUrl(request: Request) {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

async function findProfileByEmail(email: string) {
  const { data } = await getSupabaseAdmin()
    .from("profiles")
    .select("id, access_type")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  return data as { id: string; access_type: AccessType } | null;
}

/**
 * Finds or creates the Supabase Auth account and e-mails a secure link to set the password.
 * - New account: Supabase "invite" e-mail (creates the user; the trigger creates the profile).
 * - Existing account that never signed in: password-recovery e-mail (acts as "create your password").
 * - Existing account already in use: no e-mail unless `forceEmail` (the person keeps her password).
 */
export async function ensureAccountAndSendPasswordLink(opts: {
  email: string;
  name: string;
  redirectTo: string;
  forceEmail?: boolean;
}) {
  const admin = getSupabaseAdmin();
  const email = normalizeEmail(opts.email);
  const existing = await findProfileByEmail(email);

  if (!existing) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { name: opts.name },
      redirectTo: opts.redirectTo,
    });
    if (error) throw new Error(`Falha ao enviar convite: ${error.message}`);
    return { userId: data.user.id, created: true, emailSent: true };
  }

  const { data: authUser } = await admin.auth.admin.getUserById(existing.id);
  const neverSignedIn = !authUser.user?.last_sign_in_at;
  if (neverSignedIn || opts.forceEmail) {
    const { error } = await getSupabaseAnonServer().auth.resetPasswordForEmail(email, {
      redirectTo: opts.redirectTo,
    });
    if (error) throw new Error(`Falha ao enviar link de senha: ${error.message}`);
    return { userId: existing.id, created: false, emailSent: true };
  }
  return { userId: existing.id, created: false, emailSent: false };
}

/** Closes expired courtesies and removes access from profiles that only had courtesy. */
export async function expireCourtesies() {
  const admin = getSupabaseAdmin();
  const { data: expired } = await admin
    .from("courtesy_grants")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .in("status", ["invited", "active"])
    .lt("expires_at", new Date().toISOString())
    .select("user_id");

  const userIds = (expired ?? []).map((g) => g.user_id).filter(Boolean) as string[];
  if (userIds.length) {
    await admin
      .from("profiles")
      .update({ access_type: "none", subscription_status: "inactive", access_expires_at: null })
      .in("id", userIds)
      .eq("access_type", "courtesy");
  }
}

/** Grants (or extends) courtesy access on the profile without downgrading paying subscribers. */
export async function applyCourtesyToProfile(userId: string, expiresAt: string) {
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("access_type").eq("id", userId).maybeSingle();
  if (profile?.access_type === "subscriber") return "subscriber" as const;
  await admin
    .from("profiles")
    .update({ access_type: "courtesy", subscription_status: "active", access_expires_at: expiresAt })
    .eq("id", userId);
  return "courtesy" as const;
}

export async function getStudentAccess(userId: string) {
  await expireCourtesies();
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, name, email, avatar_url, phone, access_type, access_expires_at, subscription_status, subscription_plan, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return { hasAccess: false as const, profile: null };

  // First login of an invited influencer: mark the courtesy as accepted/active.
  if (profile.access_type === "courtesy") {
    await admin
      .from("courtesy_grants")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "invited");
  }

  const hasAccess =
    (profile.access_type === "subscriber" &&
      (profile.subscription_status === "active" || profile.subscription_status === "trial")) ||
    (profile.access_type === "courtesy" &&
      !!profile.access_expires_at &&
      new Date(profile.access_expires_at) > new Date());

  return { hasAccess, profile };
}
