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
 * Higieniza o segredo removendo espaços, quebras de linha e eventuais aspas
 * inseridas acidentalmente ao colar variáveis no painel da Vercel ou no .env.
 */
function sanitizeSecret(val: unknown): string {
  if (typeof val !== "string") return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
}

/**
 * Comparação em tempo constante para mitigar ataques de temporização (timing attacks).
 */
function safeTimingCompare(received: unknown, expected: unknown): boolean {
  const cleanReceived = sanitizeSecret(received);
  const cleanExpected = sanitizeSecret(expected);
  if (!cleanReceived || !cleanExpected) return false;
  const a = Buffer.from(cleanReceived);
  const b = Buffer.from(cleanExpected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
  method?: "body_secret" | "hmac_signature" | "header_token" | "query_secret";
}

/**
 * Validação rigorosa do webhook da Cakto:
 * 1. Campo 'secret' no corpo JSON: { "secret": "...", "event": "...", "data": { ... } }
 * 2. Assinatura HMAC-SHA256 nos cabeçalhos (X-Cakto-Signature e X-Cakto-Timestamp)
 * 3. Cabeçalho de autorização (Bearer token ou X-Cakto-Secret)
 * 4. Parâmetro de consulta na URL (?secret=...)
 */
function validateCaktoRequest(
  request: Request,
  rawBody: string,
  body: Record<string, unknown> | null,
  expectedSecret: string | undefined
): ValidationResult {
  const cleanExpected = sanitizeSecret(expectedSecret);
  if (!cleanExpected) {
    return { valid: false, reason: "missing_env_secret" };
  }

  // 1. Verificação Primária: Campo 'secret' no corpo JSON da Cakto
  if (body && typeof body === "object") {
    const bodySecret =
      (typeof body.secret === "string" ? body.secret : "") ||
      (typeof body.token === "string" ? body.token : "") ||
      (body.data && typeof (body.data as Record<string, unknown>).secret === "string"
        ? ((body.data as Record<string, unknown>).secret as string)
        : "") ||
      (body.fields && typeof (body.fields as Record<string, unknown>).secret === "string"
        ? ((body.fields as Record<string, unknown>).secret as string)
        : "");

    if (bodySecret && safeTimingCompare(bodySecret, cleanExpected)) {
      return { valid: true, method: "body_secret" };
    }
  }

  // 2. Assinatura HMAC-SHA256 nos cabeçalhos (se enviada pela Cakto)
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

    // Janela de tolerância de 5 minutos contra replay attacks
    if (!isNaN(timestampSec) && Math.abs(nowSec - timestampSec) <= 300) {
      const cleanReceivedSig = signatureHeader.startsWith("v1=")
        ? signatureHeader.slice(3).trim()
        : signatureHeader.trim();

      const computedHmac = createHmac("sha256", cleanExpected)
        .update(`${timestampHeader}.${rawBody}`)
        .digest("hex");

      if (safeTimingCompare(cleanReceivedSig, computedHmac)) {
        return { valid: true, method: "hmac_signature" };
      }
    }
  }

  // 3. Cabeçalhos diretos de token
  const authHeader = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const directHeaderSecret =
    request.headers.get("x-cakto-secret") ||
    request.headers.get("x-webhook-secret") ||
    "";

  if (authHeader && safeTimingCompare(authHeader, cleanExpected)) {
    return { valid: true, method: "header_token" };
  }
  if (directHeaderSecret && safeTimingCompare(directHeaderSecret, cleanExpected)) {
    return { valid: true, method: "header_token" };
  }

  // 4. Parâmetro de consulta na URL
  try {
    const urlSecret = new URL(request.url).searchParams.get("secret");
    if (urlSecret && safeTimingCompare(urlSecret, cleanExpected)) {
      return { valid: true, method: "query_secret" };
    }
  } catch {
    // ignora erro de parse da url
  }

  return { valid: false, reason: "invalid_credentials" };
}

/**
 * Identifica se a notificação é um evento de teste do painel da Cakto ou fixture de homologação,
 * permitindo responder com HTTP 200 sem criar contas ou registros fictícios no banco de produção.
 */
function isTestNotification(
  event: string,
  body: Record<string, unknown>,
  data: Record<string, unknown>,
  email: string
): boolean {
  if (event === "test" || event === "ping" || event === "webhook_test") return true;
  if (body.test === true || data.test === true || data.is_test === true) return true;
  if (data.status === "test" || data.status === "mock") return true;

  const cleanEmail = email.toLowerCase().trim();
  if (
    cleanEmail.endsWith("@example.com") ||
    cleanEmail.endsWith("@test.com") ||
    cleanEmail === "teste@gmail.com" ||
    cleanEmail === "teste@cakto.com.br" ||
    cleanEmail === "test@cakto.com.br"
  ) {
    return true;
  }

  const orderId = String(data.id ?? data.refId ?? "");
  if (orderId.startsWith("test_") || orderId.startsWith("mock_")) {
    return true;
  }

  return false;
}

export async function POST(request: Request) {
  // 1. Ler o corpo bruto da requisição
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
    // Tenta fallback para form-urlencoded caso o simulador envie dados serializados
    try {
      const params = new URLSearchParams(rawBody);
      const parsed: Record<string, unknown> = {};
      params.forEach((val, key) => {
        parsed[key] = val;
      });
      if (parsed.secret || parsed.event) {
        body = parsed;
      }
    } catch {
      body = null;
    }
  }

  const expectedSecret = process.env.CAKTO_WEBHOOK_SECRET;
  const validation = validateCaktoRequest(request, rawBody, body, expectedSecret);

  if (!validation.valid) {
    const receivedSecretCandidate =
      (body && typeof body.secret === "string" ? body.secret : "") ||
      request.headers.get("x-cakto-secret") ||
      request.headers.get("x-webhook-secret") ||
      "";

    const cleanExpected = sanitizeSecret(expectedSecret);
    const cleanReceived = sanitizeSecret(receivedSecretCandidate);

    // Diagnóstico estritamente seguro: não registra tokens, segredos ou assinaturas
    console.warn("[cakto-webhook] Rejeição de autenticação 401:", {
      hasEnvSecret: cleanExpected.length > 0,
      envSecretLength: cleanExpected.length,
      hasReceivedSecret: cleanReceived.length > 0,
      receivedSecretLength: cleanReceived.length,
      secretLengthMatches: cleanReceived.length === cleanExpected.length,
      hasHmacHeader: Boolean(request.headers.get("x-cakto-signature")),
      hasTimestampHeader: Boolean(request.headers.get("x-cakto-timestamp")),
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

  // Identificadores estáveis: correlação de pedido e assinatura independente do ID do evento
  const stableSubscriptionId =
    (data.subscription && typeof (data.subscription as Record<string, unknown>).id === "string"
      ? String((data.subscription as Record<string, unknown>).id).trim()
      : "") ||
    (typeof data.subscription_id === "string" ? data.subscription_id.trim() : "") ||
    "";

  const stableOrderId =
    (typeof data.refId === "string" && data.refId ? data.refId.trim() : "") ||
    (typeof data.order_id === "string" && data.order_id ? data.order_id.trim() : "") ||
    (typeof data.orderId === "string" && data.orderId ? data.orderId.trim() : "") ||
    (typeof data.code === "string" && data.code ? data.code.trim() : "") ||
    String(data.id ?? "").trim();

  const correlationKey = stableSubscriptionId || stableOrderId;
  const orderId = String(data.id ?? correlationKey);

  // Determina a data/hora exata do evento (cabeçalho ou payload com fallback para now)
  let eventTimestamp = new Date();
  const headerTs = request.headers.get("x-cakto-timestamp");
  if (headerTs) {
    const sec = parseInt(headerTs, 10);
    if (!isNaN(sec) && sec > 1600000000) {
      eventTimestamp = new Date(sec * 1000);
    }
  } else {
    const rawDate =
      data.created_at ||
      data.updated_at ||
      data.date ||
      (body && (body.created_at || body.timestamp));
    if (typeof rawDate === "string" || typeof rawDate === "number") {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) eventTimestamp = parsed;
    }
  }

  // 2. Se for um evento de teste do painel da Cakto, responde 200 OK sem criar registros fictícios
  const isTest = isTestNotification(event, body, data, email);
  if (isTest && (event === "test" || event === "ping" || event === "webhook_test")) {
    console.log(
      `[cakto-webhook] Evento ping/teste '${event}' autenticado com sucesso. Respondendo HTTP 200 sem criar registros fictícios em produção.`
    );
    return NextResponse.json({
      ok: true,
      test: true,
      event,
      message: "Webhook da Cakto testado e autenticado com sucesso pela Vitta Pilates.",
    });
  }

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

  // Mapeamento rigoroso do estado financeiro do pedido (evita status 'paid' em refunds/chargebacks/refused)
  let financialStatus: "paid" | "refused" | "refunded" | "chargeback" | "canceled" | "pending";
  switch (event) {
    case "purchase_approved":
    case "subscription_renewed":
      financialStatus = "paid";
      break;
    case "refund":
    case "refund_requested":
      financialStatus = "refunded";
      break;
    case "chargeback":
      financialStatus = "chargeback";
      break;
    case "subscription_canceled":
      financialStatus = "canceled";
      break;
    case "purchase_refused":
      financialStatus = "refused";
      break;
    default:
      financialStatus = "pending";
  }

  // Extração e normalização do valor monetário da transação
  let parsedAmount: number | null = null;
  const rawAmt =
    data.amount ??
    (data.offer && (data.offer as Record<string, unknown>).price) ??
    (data.product && (data.product as Record<string, unknown>).price) ??
    null;
  if (typeof rawAmt === "number" && !isNaN(rawAmt)) {
    parsedAmount = rawAmt;
  } else if (typeof rawAmt === "string") {
    const cleanNum = parseFloat(rawAmt.replace(/[^\d.,]/g, "").replace(",", "."));
    if (!isNaN(cleanNum)) parsedAmount = cleanNum;
  }

  // Armazena campos necessários para auditoria financeira e precedência
  const storedPayload: Record<string, unknown> = {
    event,
    orderId,
    subscriptionId: stableSubscriptionId || null,
    referenceId: stableOrderId || null,
    correlationKey,
    productId:
      data.product && typeof (data.product as Record<string, unknown>).id !== "undefined"
        ? String((data.product as Record<string, unknown>).id)
        : null,
    financialStatus,
    amount: parsedAmount,
    originalAmount: parsedAmount,
    refundAmount: financialStatus === "refunded" || financialStatus === "chargeback" ? parsedAmount : null,
    eventTimestamp: eventTimestamp.toISOString(),
    rawGatewayStatus: data.status == null ? null : String(data.status),
    validationMethod: validation.method,
    isTest,
  };

  const admin = getSupabaseAdmin();

  // 3. Idempotência: Cakto pode reenviar o mesmo evento múltiplas vezes
  const { error: dupError } = await admin
    .from("cakto_orders")
    .insert({ id: `${event}:${orderId}`, event, email, payload: storedPayload });

  if (dupError?.code === "23505") {
    return NextResponse.json({ duplicate: true, event, orderId });
  }
  if (dupError) {
    return NextResponse.json({ error: dupError.message }, { status: 500 });
  }

  try {
    // 4. Fluxo de Compra Aprovada ou Renovação de Assinatura
    if (event === "purchase_approved" || event === "subscription_renewed") {
      const account = await ensureAccountAndSendPasswordLink({
        email,
        name,
        redirectTo: `${siteUrl(request)}/definir-senha`,
      });

      // Atualiza o registro do pedido com status operacional do envio do e-mail
      storedPayload.emailDelivery = {
        status: account.emailDeliveryStatus,
        error: account.emailError,
        setupLinkGenerated: Boolean(account.setupLink),
      };
      await admin
        .from("cakto_orders")
        .update({
          user_id: account.userId,
          payload: storedPayload,
        })
        .eq("id", `${event}:${orderId}`);

      // Guarda contra concorrência e inversão de ordem:
      // Verifica se já existe evento revogador mais recente ou para este mesmo pedido/assinatura
      const { data: revokingOrders } = await admin
        .from("cakto_orders")
        .select("id, event, received_at, payload")
        .eq("email", email)
        .in("event", ["refund", "refund_requested", "chargeback", "subscription_canceled"]);

      const hasNewerRevocation = (revokingOrders || []).some((ro) => {
        const p = (ro.payload as Record<string, unknown>) || {};
        const roTimestampStr = p.eventTimestamp;
        const roDate = roTimestampStr ? new Date(String(roTimestampStr)) : new Date(ro.received_at);
        if (roDate.getTime() >= eventTimestamp.getTime()) return true;
        if (p.correlationKey && correlationKey && p.correlationKey === correlationKey) return true;
        return false;
      });

      if (hasNewerRevocation) {
        console.warn(
          `[cakto-webhook] Precedência aplicada: Evento de aprovação '${event}' não ativará acesso de ${email} pois existe cancelamento/reembolso registrado.`
        );

        await admin
          .from("profiles")
          .update({
            access_type: "none",
            subscription_status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", account.userId);

        return NextResponse.json({
          ok: true,
          active: false,
          precedence: "revoked_by_newer_event",
          created: account.created,
          emailDeliveryStatus: account.emailDeliveryStatus,
        });
      }

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

      // Vincula submissão do quiz personalizado, se houver sessão registrada
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

      return NextResponse.json({
        ok: true,
        active: true,
        created: account.created,
        emailDeliveryStatus: account.emailDeliveryStatus,
      });
    }

    // 5. Fluxo de Revogação de Acesso: Reembolso, Chargeback ou Cancelamento de Assinatura
    if (REVOKING_EVENTS.has(event)) {
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

        // Revoga o acesso no perfil da aluna
        await admin
          .from("profiles")
          .update({
            access_type: "none",
            subscription_status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userProfile.id);
      } else {
        // Se o perfil ainda não existe (ex: eventos concorrentes), cria/garante com acesso revogado
        const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
        const match = listData?.users?.find((u) => u.email && normalizeEmail(u.email) === email);

        await admin.from("profiles").upsert({
          id: match?.id || undefined,
          email,
          name,
          access_type: "none",
          subscription_status: "canceled",
          updated_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({ ok: true, revoked: true });
    }

    // 6. Evento Recusado (purchase_refused)
    if (event === "purchase_refused") {
      return NextResponse.json({ ok: true, status: "refused", ignored: "purchase_refused" });
    }

    return NextResponse.json({ ignored: event });
  } catch (err) {
    // Remove o registro da idempotência em caso de falha transitória para permitir nova entrega pela Cakto
    await admin.from("cakto_orders").delete().eq("id", `${event}:${orderId}`);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
