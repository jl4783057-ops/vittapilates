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
  const existingProfile = await findProfileByEmail(email);

  // 1. Se o perfil existir, confirma se o usuário correspondente ainda existe no Auth
  let authUserId = existingProfile?.id || null;
  let authUserExists = false;

  if (authUserId) {
    const { data: authUserRes, error: getAuthError } = await admin.auth.admin.getUserById(authUserId);
    if (!getAuthError && authUserRes?.user) {
      authUserExists = true;
    } else {
      // Usuário foi apagado do Auth, mas o perfil antigo permaneceu
      console.warn(`[access] Perfil ${authUserId} existe mas usuário Auth não foi encontrado. Limpando perfil antigo órfão...`);
      await admin.from("profiles").delete().eq("id", authUserId);
      authUserId = null;
    }
  }

  // 2. Se não encontramos pelo profile, verifica se existe usuário no Auth com este e-mail
  if (!authUserId) {
    const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
    const match = listData?.users?.find((u) => u.email && normalizeEmail(u.email) === email);
    if (match) {
      authUserId = match.id;
      authUserExists = true;
      // Garante que o perfil existe
      await admin.from("profiles").upsert({
        id: match.id,
        email,
        name: opts.name || (match.user_metadata?.name as string) || email.split("@")[0],
        subscription_status: "inactive",
        access_type: "none",
      });
    }
  }

  // 3. Se o usuário realmente não existe no Auth, convida via inviteUserByEmail
  if (!authUserExists || !authUserId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { name: opts.name },
      redirectTo: opts.redirectTo,
    });

    if (error) {
      // Se o usuário já existia ou se o envio do e-mail falhou por limite de SMTP
      const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
      const match = listData?.users?.find((u) => u.email && normalizeEmail(u.email) === email);

      if (match) {
        authUserId = match.id;
      } else {
        // Fallback resiliente: cria o usuário diretamente no Auth sem travar por limite de SMTP
        console.warn(`[access] inviteUserByEmail não entregou e-mail (${error.message}). Criando usuário diretamente no Auth...`);
        const { data: createData, error: createError } = await admin.auth.admin.createUser({
          email,
          user_metadata: { name: opts.name },
          email_confirm: true,
        });

        if (createError && !createError.message.toLowerCase().includes("exists")) {
          throw new Error(`Falha ao registrar conta no Auth: ${createError.message}`);
        }
        if (createData?.user) {
          authUserId = createData.user.id;
        }
      }

      if (authUserId) {
        await admin.from("profiles").upsert({
          id: authUserId,
          email,
          name: opts.name || email.split("@")[0],
          subscription_status: "inactive",
          access_type: "none",
        });

        let setupLink: string | null = null;
        try {
          const { data: linkData } = await admin.auth.admin.generateLink({
            type: "recovery",
            email,
            options: { redirectTo: opts.redirectTo },
          });
          if (linkData?.properties?.action_link) {
            setupLink = linkData.properties.action_link;
          }
        } catch (linkErr) {
          console.warn("[access] Aviso não impeditivo: falha ao pré-gerar link seguro de senha:", linkErr);
        }

        try {
          await getSupabaseAnonServer().auth.resetPasswordForEmail(email, {
            redirectTo: opts.redirectTo,
          });
        } catch (mailErr) {
          console.warn("[access] Aviso não impeditivo: falha no envio do e-mail de definição de senha:", mailErr);
        }

        return {
          userId: authUserId,
          created: true,
          emailSent: false,
          emailDeliveryStatus: "failed" as const,
          emailError: error.message,
          setupLink,
        };
      }

      throw new Error(`Falha ao criar conta de autenticação: ${error.message}`);
    } else if (data?.user) {
      authUserId = data.user.id;
      // Garante perfil
      await admin.from("profiles").upsert({
        id: data.user.id,
        email,
        name: opts.name || email.split("@")[0],
        subscription_status: "inactive",
        access_type: "none",
      });

      return {
        userId: data.user.id,
        created: true,
        emailSent: true,
        emailDeliveryStatus: "sent" as const,
        emailError: null,
        setupLink: null,
      };
    }
  }

  // 4. Usuário existente no Auth: dispara link de definição/redefinição de senha
  if (authUserId) {
    const { data: authUser } = await admin.auth.admin.getUserById(authUserId);
    const neverSignedIn = !authUser.user?.last_sign_in_at;

    if (neverSignedIn || opts.forceEmail) {
      const { error } = await getSupabaseAnonServer().auth.resetPasswordForEmail(email, {
        redirectTo: opts.redirectTo,
      });

      let setupLink: string | null = null;
      try {
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: opts.redirectTo },
        });
        if (linkData?.properties?.action_link) {
          setupLink = linkData.properties.action_link;
        }
      } catch (linkErr) {
        console.warn("[access] Aviso não impeditivo: falha ao pré-gerar link seguro para usuário existente:", linkErr);
      }

      if (error) {
        console.warn(`[access] Aviso não impeditivo ao enviar link de senha para ${email}: ${error.message}`);
        return {
          userId: authUserId,
          created: false,
          emailSent: false,
          emailDeliveryStatus: "failed" as const,
          emailError: error.message,
          setupLink,
        };
      }
      return {
        userId: authUserId,
        created: false,
        emailSent: true,
        emailDeliveryStatus: "sent" as const,
        emailError: null,
        setupLink,
      };
    }

    return {
      userId: authUserId,
      created: false,
      emailSent: false,
      emailDeliveryStatus: "skipped" as const,
      emailError: null,
      setupLink: null,
    };
  }

  throw new Error("Não foi possível identificar ou criar o usuário de autenticação.");
}

/**
 * Gera sob demanda um link seguro de definição de senha/primeiro acesso sem expor dados sensíveis em logs.
 */
export async function generateStudentPasswordLink(email: string, redirectTo: string): Promise<string> {
  const admin = getSupabaseAdmin();
  const cleanEmail = normalizeEmail(email);
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: cleanEmail,
    options: { redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    throw new Error(error?.message || "Não foi possível gerar o link de acesso no Supabase Auth.");
  }

  return data.properties.action_link;
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
  try {
    await expireCourtesies();
  } catch (err) {
    console.warn("[getStudentAccess] Falha não impeditiva ao expirar cortesias:", err);
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("id, name, email, avatar_url, phone, access_type, access_expires_at, subscription_status, subscription_plan, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[getStudentAccess] Erro ao consultar perfil:", error);
      return { hasAccess: false as const, profile: null };
    }

    if (!profile) return { hasAccess: false as const, profile: null };

    // First login of an invited influencer: mark the courtesy as accepted/active.
    if (profile.access_type === "courtesy") {
      try {
        await admin
          .from("courtesy_grants")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("status", "invited");
      } catch (courtesyErr) {
        console.warn("[getStudentAccess] Falha ao atualizar courtesy_grants:", courtesyErr);
      }
    }

    const hasAccess =
      ((profile.access_type === "subscriber" || !profile.access_type) &&
        (profile.subscription_status === "active" || profile.subscription_status === "trial")) ||
      (profile.access_type === "courtesy" &&
        !!profile.access_expires_at &&
        new Date(profile.access_expires_at) > new Date());

    return { hasAccess, profile };
  } catch (err) {
    console.error("[getStudentAccess] Exceção ao verificar acesso:", err);
    return { hasAccess: false as const, profile: null };
  }
}
