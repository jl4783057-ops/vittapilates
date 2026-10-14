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

  const productFilter = process.env.CAKTO_PRODUCT_ID;
  if (productFilter && data.product?.id && String(data.product.id) !== productFilter) {
    return NextResponse.json({ ignored: "other product" });
  }
  if (!email || !orderId) return NextResponse.json({ error: "Missing customer email or order id" }, { status: 400 });

  const admin = getSupabaseAdmin();

  // Idempotency: Cakto may deliver the same event more than once.
  const { error: dupError } = await admin
    .from("cakto_orders")
    .insert({ id: `${event}:${orderId}`, event, email, payload: body });
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
