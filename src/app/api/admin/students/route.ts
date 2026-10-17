import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  isAdminRequest,
  generateStudentPasswordLink,
  ensureAccountAndSendPasswordLink,
  siteUrl,
} from "@/lib/access";
import { User, SubscriptionStatus, SubscriptionPlan } from "@/types";

export function mapDbProfileToUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    name: String(row.name || "Aluna"),
    email: String(row.email),
    role: (row.role as 'aluna' | 'admin') || "aluna",
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : undefined,
    phone: typeof row.phone === "string" ? row.phone : undefined,
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    subscriptionStatus: (row.subscription_status as SubscriptionStatus) || "inactive",
    subscriptionPlan: (row.subscription_plan as SubscriptionPlan) || "Mensal",
    subscriptionRenewalDate: typeof row.subscription_renewal_date === "string" ? row.subscription_renewal_date : undefined,
    accessType: (row.access_type as 'none' | 'subscriber' | 'courtesy') || "none",
    accessExpiresAt: typeof row.access_expires_at === "string" ? row.access_expires_at : null,
    completedLessonIds: Array.isArray(row.completed_lesson_ids) ? (row.completed_lesson_ids as string[]) : [],
    lastLessonId: typeof row.last_lesson_id === "string" ? row.last_lesson_id : undefined,
    customPlan: typeof row.custom_plan === "object" ? (row.custom_plan as any) : null,
  };
}

// GET: Retorna alunas reais cadastradas no Supabase (exclusivo para administrador autenticado)
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ configured: false, students: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("*")
      .neq("role", "admin")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao listar perfis no Supabase:", error.message);
      return NextResponse.json({ error: "Erro ao consultar alunas no banco." }, { status: 500 });
    }

    const { data: orders } = await admin
      .from("cakto_orders")
      .select("email, event, payload, received_at")
      .order("received_at", { ascending: false });

    const orderMap: Record<string, { emailDeliveryStatus?: string; error?: string }> = {};
    (orders || []).forEach((o) => {
      const em = (o.email || "").toLowerCase().trim();
      if (!orderMap[em] && o.payload && typeof o.payload === "object") {
        const p = o.payload as Record<string, unknown>;
        if (p.emailDelivery && typeof p.emailDelivery === "object") {
          const ed = p.emailDelivery as Record<string, unknown>;
          orderMap[em] = {
            emailDeliveryStatus: typeof ed.status === "string" ? ed.status : undefined,
            error: typeof ed.error === "string" ? ed.error : undefined,
          };
        }
      }
    });

    const students = (profiles || []).map((p) => {
      const user = mapDbProfileToUser(p);
      const delivery = orderMap[(user.email || "").toLowerCase().trim()];
      return {
        ...user,
        emailDeliveryStatus: delivery?.emailDeliveryStatus || null,
        emailDeliveryError: delivery?.error || null,
      };
    });

    return NextResponse.json({ configured: true, students }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Erro interno na API de alunas:", err);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}

// PATCH: Atualiza dados de status, plano ou perfil de uma aluna de forma persistente
export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, subscriptionStatus, subscriptionPlan, accessType, avatarUrl, name, phone } = body;

    if (!id) {
      return NextResponse.json({ error: "ID da aluna obrigatório." }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (subscriptionStatus !== undefined) updatePayload.subscription_status = subscriptionStatus;
    if (subscriptionPlan !== undefined) updatePayload.subscription_plan = subscriptionPlan;
    if (accessType !== undefined) updatePayload.access_type = accessType;
    if (avatarUrl !== undefined) updatePayload.avatar_url = avatarUrl || null;
    if (name !== undefined) updatePayload.name = name;
    if (phone !== undefined) updatePayload.phone = phone || null;

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("profiles")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, student: mapDbProfileToUser(data) });
  } catch (err: unknown) {
    console.error("Erro ao atualizar aluna no Supabase:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao atualizar aluna no banco." },
      { status: 500 }
    );
  }
}

// POST: Operações administrativas especiais (geração sob demanda de link de primeiro acesso/senha)
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { action, email } = body;

    if (action === "generate_password_link") {
      if (!email) {
        return NextResponse.json({ error: "E-mail da aluna obrigatório." }, { status: 400 });
      }
      const redirectTo = `${siteUrl(request)}/definir-senha`;
      const link = await generateStudentPasswordLink(email, redirectTo);
      return NextResponse.json({ success: true, link });
    }

    if (action === "resend_invite_email") {
      if (!email) {
        return NextResponse.json({ error: "E-mail da aluna obrigatório." }, { status: 400 });
      }
      const redirectTo = `${siteUrl(request)}/definir-senha`;
      const account = await ensureAccountAndSendPasswordLink({
        email,
        name: typeof body.name === "string" ? body.name : email.split("@")[0],
        redirectTo,
        forceEmail: true,
      });

      return NextResponse.json({
        success: true,
        emailSent: account.emailSent,
        emailDeliveryStatus: account.emailDeliveryStatus,
        error: account.emailError,
      });
    }

    return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
  } catch (err: unknown) {
    console.error("Erro na rota POST de alunas:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao processar ação administrativa." },
      { status: 500 }
    );
  }
}
