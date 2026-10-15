import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureAccountAndSendPasswordLink, normalizeEmail, siteUrl } from "@/lib/access";

/**
 * Cakto webhook. Access is ONLY released here, after Cakto confirms the payment —
 * never from the checkout return page.
 * Configure in Cakto: URL = https://<domain>/api/webhooks/cakto, then copy the generated
 * secret into CAKTO_WEBHOOK_SECRET. Optional: CAKTO_PRODUCT_ID to ignore other products.
 */

const REVOKING_EVENTS = new Set(["refund", "chargeback", "subscription_canceled"]);

function secretMatches(received: unknown) {
  const expected = process.env.CAKTO_WEBHOOK_SECRET;
  if (!expected || typeof received !== "string") return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !secretMatches(body.secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured) {
    // 503 makes Cakto retry later instead of losing the purchase.
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const event = String(body.event ?? "");
  const data = body.data ?? {};
  const email = data.customer?.email ? normalizeEmail(String(data.customer.email)) : "";
  const name = String(data.customer?.name ?? "").trim() || email.split("@")[0];
  const orderId = String(data.id ?? data.refId ?? "");
  // Keep only fields needed for troubleshooting; never persist the webhook credential
  // or the provider's full customer/payment payload in our database.
  const storedPayload = {
    event,
    orderId,
    productId: data.product?.id == null ? null : String(data.product.id),
    status: data.status == null ? null : String(data.status),
  };

  const productFilter = process.env.CAKTO_PRODUCT_ID;
  if (productFilter && data.product?.id && String(data.product.id) !== productFilter) {
    return NextResponse.json({ ignored: "other product" });
  }
  if (!email || !orderId) return NextResponse.json({ error: "Missing customer email or order id" }, { status: 400 });

  const admin = getSupabaseAdmin();

  // Idempotency: Cakto may deliver the same event more than once.
  const { error: dupError } = await admin
    .from("cakto_orders")
    .insert({ id: `${event}:${orderId}`, event, email, payload: storedPayload });
  if (dupError?.code === "23505") return NextResponse.json({ duplicate: true });
  if (dupError) return NextResponse.json({ error: dupError.message }, { status: 500 });

  try {
    if (event === "purchase_approved" || event === "subscription_renewed") {
      // Creates the account (or reuses it, e.g. an influencer who had a courtesy) and e-mails
      // the secure "set your password" link when she has never logged in.
      const account = await ensureAccountAndSendPasswordLink({
        email,
        name,
        redirectTo: `${siteUrl(request)}/definir-senha`,
      });

      await admin
        .from("profiles")
        .update({ access_type: "subscriber", subscription_status: "active", access_expires_at: null })
        .eq("id", account.userId);

      await admin
        .from("courtesy_grants")
        .update({ status: "converted", updated_at: new Date().toISOString() })
        .eq("user_id", account.userId)
        .in("status", ["invited", "active", "expired"]);

      // Associar respostas do quiz confirmadas para esta compra
      try {
        const quizSessionId =
          data.sck ||
          data.custom_id ||
          data.tracking_id ||
          (data.metadata && typeof data.metadata === "object" ? data.metadata.quiz_session_id : null);

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
          // Busca estrita por e-mail registrado na submissão
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
          // 1. Vincular a submissão ao ID da usuária
          await admin
            .from("quiz_submissions")
            .update({ user_id: account.userId })
            .eq("id", submission.id);

          // 2. Extrair dados essenciais do quiz para o perfil
          const ans = submission.answers || {};
          const plan = submission.generated_plan || {};

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
        console.warn("Aviso ao associar dados do quiz à compra aprovada:", quizErr);
      }

      await admin.from("cakto_orders").update({ user_id: account.userId }).eq("id", `${event}:${orderId}`);
      return NextResponse.json({ ok: true, created: account.created });
    }

    if (REVOKING_EVENTS.has(event)) {
      await admin
        .from("profiles")
        .update({ access_type: "none", subscription_status: "canceled" })
        .eq("email", email)
        .eq("access_type", "subscriber");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ignored: event });
  } catch (err) {
    // Allow Cakto to retry this delivery.
    await admin.from("cakto_orders").delete().eq("id", `${event}:${orderId}`);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
