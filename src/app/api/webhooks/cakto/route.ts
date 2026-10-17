import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureAccountAndSendPasswordLink, normalizeEmail, siteUrl } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Eventos que cancelam ou revogam o acesso da aluna à plataforma.
 */
const REVOKING_EVENTS = new Set([
  "refund",
  "refund_requested",
  "chargeback",
  "subscription_canceled",
]);

/**
 * Comparação em tempo constante para mitigar ataques de timing (timing attacks).
 */
function safeTimingCompare(received: string, expected: string): boolean {
  if (typeof received !== "string" || typeof expected !== "string") return false;
  const a = Buffer.from(received.trim());
  const b = Buffer.from(expected.trim());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
  method?: "hmac_signature" | "body_secret" | "header_token";
}

/**
 * Validação rigorosa do webhook da Cakto:
 * 1. Padrão Oficial Cakto: HMAC-SHA256 via cabeçalhos X-Cakto-Signature e X-Cakto-Timestamp
 *    Base assinada: `${timestamp}.${rawBody}`
 *    Tolerância máxima: 300 segundos (5 minutos) contra ataques de repetição (replay attacks).
 * 2. Padrão Alternativo / Simulador de Painel: Chave secreta enviada no corpo JSON (body.secret)
 * 3. Fallback de Cabeçalho Direto: Authorization: Bearer <secret> ou X-Cakto-Secret
 */
function validateCaktoRequest(
  request: Request,
  rawBody: string,
  body: Record<string, unknown> | null,
  expectedSecret: string | undefined
): ValidationResult {
  if (!expectedSecret || expectedSecret.trim().length === 0) {
    return { valid: false, reason: "missing_env_secret" };
  }

  const cleanSecret = expectedSecret.trim();

  // 1. Método Oficial: Assinatura HMAC-SHA256 nos cabeçalhos
  const signatureHeader =
    request.headers.get("x-cakto-signature") ||
    request.headers.get("x-signature") ||
    "";
  const timestampHeader =
    request.headers.get("x-cakto-timestamp") ||
    request.headers.get("x-timestamp") ||
    "";

  if (signatureHeader && timestampHeader) {
    const timestampSec = parseInt(timestampHeader, 10);
    const nowSec = Math.floor(Date.now() / 1000);

    // Janela de tolerância contra replay attack
    if (isNaN(timestampSec) || Math.abs(nowSec - timestampSec) > 300) {
      return { valid: false, reason: "timestamp_out_of_window" };
    }

    // Suporta formato "v1=<hash>" ou diretamente o hash hexadecimal
    const cleanReceivedSig = signatureHeader.startsWith("v1=")
      ? signatureHeader.slice(3).trim()
      : signatureHeader.trim();

    const computedHmac = createHmac("sha256", cleanSecret)
      .update(`${timestampHeader}.${rawBody}`)
      .digest("hex");

    if (safeTimingCompare(cleanReceivedSig, computedHmac)) {
      return { valid: true, method: "hmac_signature" };
    }
  }

  // 2. Método Alternativo / Simulador Cakto: Secret no corpo JSON
  if (body && typeof body === "object") {
    const bodySecret =
      (typeof body.secret === "string" ? body.secret : "") ||
      (body.fields && typeof (body.fields as Record<string, unknown>).secret === "string"
        ? ((body.fields as Record<string, unknown>).secret as string)
        : "") ||
      (body.data && typeof (body.data as Record<string, unknown>).secret === "string"
        ? ((body.data as Record<string, unknown>).secret as string)
        : "");

    if (bodySecret && safeTimingCompare(bodySecret, cleanSecret)) {
      return { valid: true, method: "body_secret" };
    }
  }

  // 3. Fallback: Cabeçalho direto de Token/Bearer
  const authHeader = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const directSecretHeader =
    request.headers.get("x-cakto-secret") ||
    request.headers.get("x-webhook-secret") ||
    "";

  if (authHeader && safeTimingCompare(authHeader, cleanSecret)) {
    return { valid: true, method: "header_token" };
  }
  if (directSecretHeader && safeTimingCompare(directSecretHeader, cleanSecret)) {
    return { valid: true, method: "header_token" };
  }

  return { valid: false, reason: "invalid_credentials" };
}

export async function POST(request: Request) {
  // 1. Ler o corpo bruto (raw body) preservando bytes exatos para cálculo HMAC
  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Falha ao ler corpo da requisição" }, { status: 400 });
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }

  const expectedSecret = process.env.CAKTO_WEBHOOK_SECRET;
  const validation = validateCaktoRequest(request, rawBody, body, expectedSecret);

  if (!validation.valid) {
    // Diagnóstico estritamente seguro: não registra tokens, segredos ou assinaturas
    console.warn("[cakto-webhook] Rejeição de autenticação 401:", {
      hasEnvSecret: Boolean(expectedSecret && expectedSecret.trim().length > 0),
      hasHmacHeader: Boolean(request.headers.get("x-cakto-signature")),
      hasTimestampHeader: Boolean(request.headers.get("x-cakto-timestamp")),
      hasBodySecret: Boolean(body && typeof body === "object" && Boolean(body.secret)),
      reason: validation.reason,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseAdminConfigured) {
    // HTTP 503 instrui a Cakto a retentar o envio posteriormente
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  if (!body) {
    return NextResponse.json({ error: "Payload JSON inválido" }, { status: 400 });
  }

  const event = String(body.event ?? "");
  const data = (body.data as Record<string, unknown>) ?? {};
  const customer =
    (data.customer as Record<string, unknown>) ??
    (data.buyer as Record<string, unknown>) ??
    (data.client as Record<string, unknown>) ??
    {};

  const email = customer.email
    ? normalizeEmail(String(customer.email))
    : data.email
    ? normalizeEmail(String(data.email))
    : "";

  const name =
    String(customer.name ?? data.name ?? "").trim() ||
    (email ? email.split("@")[0] : "Aluna");

  const orderId = String(
    data.id ??
    data.refId ??
    (data.subscription && (data.subscription as Record<string, unknown>).id) ??
    ""
  );

  // Armazena apenas campos necessários para auditoria; nunca persiste credenciais do webhook
  const storedPayload = {
    event,
    orderId,
    productId:
      data.product && typeof (data.product as Record<string, unknown>).id !== "undefined"
        ? String((data.product as Record<string, unknown>).id)
        : null,
    status: data.status == null ? null : String(data.status),
    amount:
      data.amount ??
      (data.offer && (data.offer as Record<string, unknown>).price) ??
      (data.product && (data.product as Record<string, unknown>).price) ??
      null,
    validationMethod: validation.method,
  };

  const productFilter = process.env.CAKTO_PRODUCT_ID;
  if (
    productFilter &&
    data.product &&
    String((data.product as Record<string, unknown>).id) !== productFilter
  ) {
    return NextResponse.json({ ignored: "other product" });
  }

  if (!email || !orderId) {
    return NextResponse.json(
      { error: "Missing customer email or order id" },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  // Idempotência: Cakto pode reenviar o mesmo evento múltiplas vezes
  const { error: dupError } = await admin
    .from("cakto_orders")
    .insert({ id: `${event}:${orderId}`, event, email, payload: storedPayload });

  if (dupError?.code === "23505") {
    return NextResponse.json({ duplicate: true });
  }
  if (dupError) {
    return NextResponse.json({ error: dupError.message }, { status: 500 });
  }

  try {
    if (event === "purchase_approved" || event === "subscription_renewed") {
      // Cria a conta no Supabase Auth ou reaproveita conta existente (ex: cortesia convertida)
      // Dispara o e-mail oficial com o link seguro de criação/definição de senha caso nunca tenha acessado
      const account = await ensureAccountAndSendPasswordLink({
        email,
        name,
        redirectTo: `${siteUrl(request)}/definir-senha`,
      });

      // Ativa o status de assinante
      await admin
        .from("profiles")
        .update({
          access_type: "subscriber",
          subscription_status: "active",
          subscription_plan: "Mensal",
          access_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.userId);

      // Converte eventual cortesia de influenciadora
      await admin
        .from("courtesy_grants")
        .update({ status: "converted", updated_at: new Date().toISOString() })
        .eq("user_id", account.userId)
        .in("status", ["invited", "active", "expired"]);

      // Associar respostas do quiz personalizado, se houver sessão registrada
      try {
        const quizSessionId =
          data.sck ||
          data.custom_id ||
          data.tracking_id ||
          (data.metadata && typeof data.metadata === "object"
            ? (data.metadata as Record<string, unknown>).quiz_session_id
            : null);

        let submission = null;

        if (quizSessionId && typeof quizSessionId === "string") {
          const { data: subById } = await admin
            .from("quiz_submissions")
            .select("id, answers, generated_plan")
            .eq("id", quizSessionId)
            .maybeSingle();
          if (subById) submission = subById;
        }

        if (!submission && email) {
          const { data: subByEmail } = await admin
            .from("quiz_submissions")
            .select("id, answers, generated_plan")
            .contains("answers", { email })
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (subByEmail) submission = subByEmail;
        }

        if (submission) {
          await admin
            .from("quiz_submissions")
            .update({ user_id: account.userId })
            .eq("id", submission.id);

          const ans = (submission.answers as Record<string, unknown>) || {};
          const plan = (submission.generated_plan as Record<string, unknown>) || {};

          const profileUpdates: Record<string, unknown> = {
            custom_plan: {
              ...plan,
              userName: ans.name || name,
              birthDate: ans.birthDate || null,
              mainGoal: ans.mainGoal || null,
              currentWeight: ans.currentWeightKg || null,
              targetWeight: ans.targetWeightKg || null,
              heightCm: ans.heightCm || null,
              bmi: ans.bmi || null,
              bodyType: ans.bodyType || null,
              desiredBodyShape: ans.desiredBodyShape || null,
              targetArea: ans.targetArea || null,
              quizSessionId: submission.id,
            },
          };

          if (ans.name && typeof ans.name === "string" && ans.name.trim().length >= 2) {
            profileUpdates.name = ans.name.trim();
          }

          await admin
            .from("profiles")
            .update(profileUpdates)
            .eq("id", account.userId);
        }
      } catch (quizErr) {
        console.warn("[cakto-webhook] Aviso ao associar dados do quiz à compra aprovada:", quizErr);
      }

      await admin
        .from("cakto_orders")
        .update({ user_id: account.userId })
        .eq("id", `${event}:${orderId}`);

      return NextResponse.json({ ok: true, created: account.created });
    }

    if (REVOKING_EVENTS.has(event)) {
      // Localiza o usuário correspondente para auditoria e vinculação
      const { data: userProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (userProfile?.id) {
        await admin
          .from("cakto_orders")
          .update({ user_id: userProfile.id })
          .eq("id", `${event}:${orderId}`);
      }

      // Revoga o acesso no perfil da aluna
      await admin
        .from("profiles")
        .update({
          access_type: "none",
          subscription_status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("email", email);

      return NextResponse.json({ ok: true, revoked: true });
    }

    return NextResponse.json({ ignored: event });
  } catch (err) {
    // Em caso de falha de processamento no banco, remove o registro da idempotência para permitir que a Cakto tente novamente
    await admin.from("cakto_orders").delete().eq("id", `${event}:${orderId}`);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
