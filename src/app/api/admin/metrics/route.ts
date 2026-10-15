import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/access";

interface DashboardMetricsResponse {
  configured: boolean;
  gateway: {
    name: string;
    status: "active" | "not_configured";
    webhookUrl: string;
  };
  metrics: {
    // Indicadores reais
    totalApprovedPurchases: number;
    activeSubscribers: number;
    canceledSubscribers: number;
    totalCourtesies: number;
    activeCourtesies: number;
    periodApprovedPurchases: number;
    periodNewSubscribers: number;
    periodCancellationsOrRefunds: number;
    // Métricas financeiras e de ciclo
    hasFinancialAmountData: boolean;
    realGrossRevenue: number | null; // Apenas se houver valores monetários reais salvos
    insufficientDataReason: string;
  };
  period: {
    start: string;
    end: string;
  };
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  const now = new Date();
  const startDate = startParam ? new Date(startParam) : new Date(now.getTime() - 29 * 86_400_000);
  const endDate = endParam ? new Date(endParam) : now;

  const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const webhookUrl = siteOrigin ? `${siteOrigin}/api/webhooks/cakto` : "/api/webhooks/cakto";

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json<DashboardMetricsResponse>({
      configured: false,
      gateway: {
        name: "Cakto",
        status: "not_configured",
        webhookUrl,
      },
      metrics: {
        totalApprovedPurchases: 0,
        activeSubscribers: 0,
        canceledSubscribers: 0,
        totalCourtesies: 0,
        activeCourtesies: 0,
        periodApprovedPurchases: 0,
        periodNewSubscribers: 0,
        periodCancellationsOrRefunds: 0,
        hasFinancialAmountData: false,
        realGrossRevenue: null,
        insufficientDataReason: "Banco de dados Supabase não configurado.",
      },
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  }

  try {
    const admin = getSupabaseAdmin();

    // 1. Pedidos da Cakto (cakto_orders)
    const { data: orders, error: ordersErr } = await admin
      .from("cakto_orders")
      .select("id, event, email, user_id, payload, received_at");

    if (ordersErr) {
      console.error("Erro ao buscar cakto_orders:", ordersErr);
    }

    const allOrders = orders || [];
    const approvedEvents = ["purchase_approved", "subscription_renewed"];
    const revokingEvents = ["refund", "chargeback", "subscription_canceled"];

    const approvedOrders = allOrders.filter((o) => approvedEvents.includes(o.event));
    const periodApprovedOrders = approvedOrders.filter((o) => {
      const d = new Date(o.received_at);
      return d >= startDate && d <= endDate;
    });

    const revokingOrders = allOrders.filter((o) => revokingEvents.includes(o.event));
    const periodRevokingOrders = revokingOrders.filter((o) => {
      const d = new Date(o.received_at);
      return d >= startDate && d <= endDate;
    });

    // 2. Perfis reais do Supabase (profiles)
    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("id, name, email, role, access_type, subscription_status, created_at");

    if (profErr) {
      console.error("Erro ao buscar profiles:", profErr);
    }

    const studentProfiles = (profiles || []).filter((p) => p.role !== "admin");

    // Alunas com acesso ativo exclusivamente por assinatura paga (NÃO cortesia)
    const activeSubscribers = studentProfiles.filter(
      (p) => p.access_type === "subscriber" && (p.subscription_status === "active" || p.subscription_status === "trial")
    );

    // Alunas com assinatura cancelada
    const canceledSubscribers = studentProfiles.filter(
      (p) => p.access_type === "subscriber" && p.subscription_status === "canceled"
    );

    // Novas assinantes no período selecionado
    const periodNewSubscribers = activeSubscribers.filter((p) => {
      const d = new Date(p.created_at);
      return d >= startDate && d <= endDate;
    });

    // 3. Cortesias reais de influenciadoras (courtesy_grants) - contabilizadas à parte
    const { data: courtesies, error: courtErr } = await admin
      .from("courtesy_grants")
      .select("id, status, expires_at");

    if (courtErr) {
      console.error("Erro ao buscar courtesy_grants:", courtErr);
    }

    const allCourtesies = courtesies || [];
    const activeCourtesies = allCourtesies.filter(
      (c) => (c.status === "active" || c.status === "invited") && new Date(c.expires_at) > now
    );

    // 4. Verificação de valores financeiros reais
    // O webhook da Cakto salva apenas event, orderId, productId, status para segurança e minimização de dados.
    // Nenhum valor monetário (ex: currency/amount) é persistido no banco de dados atualmente.
    const hasFinancialAmountData = false;
    const realGrossRevenue = null;
    const insufficientDataReason =
      "O webhook da Cakto está ativo e registrando eventos, porém o valor monetário da transação (R$) não é armazenado no banco local. Indicadores financeiros como Receita, MRR e ARPU requerem a gravação do valor monetário líquido por pedido no Supabase.";

    return NextResponse.json<DashboardMetricsResponse>({
      configured: true,
      gateway: {
        name: "Cakto",
        status: "active",
        webhookUrl,
      },
      metrics: {
        totalApprovedPurchases: approvedOrders.length,
        activeSubscribers: activeSubscribers.length,
        canceledSubscribers: canceledSubscribers.length,
        totalCourtesies: allCourtesies.length,
        activeCourtesies: activeCourtesies.length,
        periodApprovedPurchases: periodApprovedOrders.length,
        periodNewSubscribers: periodNewSubscribers.length,
        periodCancellationsOrRefunds: periodRevokingOrders.length,
        hasFinancialAmountData,
        realGrossRevenue,
        insufficientDataReason,
      },
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("Erro na API da dashboard:", err);
    return NextResponse.json(
      { error: "Erro interno ao consolidar dados da dashboard." },
      { status: 500 }
    );
  }
}
