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
    realGrossRevenue: number | null;
    realNetRevenue: number | null;
    realRefundsAmount: number | null;
    mrr: number | null;
    insufficientDataReason: string;
  };
  period: {
    start: string;
    end: string;
  };
}

function isTestEmailOrOrder(email: string, payload: Record<string, unknown> | null, orderId: string): boolean {
  if (payload?.isTest === true) return true;
  const cleanEmail = (email || "").toLowerCase().trim();
  if (
    cleanEmail.endsWith("@example.com") ||
    cleanEmail.endsWith("@test.com") ||
    cleanEmail === "teste@gmail.com" ||
    cleanEmail === "teste@cakto.com.br" ||
    cleanEmail === "test@cakto.com.br"
  ) {
    return true;
  }
  const cleanId = String(orderId || "").toLowerCase();
  if (cleanId.startsWith("test_") || cleanId.startsWith("mock_")) return true;
  return false;
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
        realNetRevenue: null,
        realRefundsAmount: null,
        mrr: null,
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

    // Exclusão estrita de eventos e contas de teste das métricas de produção
    const productionOrders = allOrders.filter(
      (o) => !isTestEmailOrOrder(o.email, o.payload as Record<string, unknown>, o.id)
    );

    // Vendas confirmadas e pagas (exclui recusadas)
    const approvedOrders = productionOrders.filter(
      (o) =>
        (o.event === "purchase_approved" || o.event === "subscription_renewed") &&
        (o.payload as Record<string, unknown>)?.financialStatus !== "refused"
    );

    const periodApprovedOrders = approvedOrders.filter((o) => {
      const d = new Date(o.received_at);
      return d >= startDate && d <= endDate;
    });

    // Reembolsos, estornos e cancelamentos
    const refundedOrChargebackOrders = productionOrders.filter((o) => {
      const p = (o.payload as Record<string, unknown>) || {};
      return (
        o.event === "refund" ||
        o.event === "refund_requested" ||
        o.event === "chargeback" ||
        p.financialStatus === "refunded" ||
        p.financialStatus === "chargeback"
      );
    });

    const revokingOrders = productionOrders.filter((o) =>
      ["refund", "refund_requested", "chargeback", "subscription_canceled"].includes(o.event)
    );

    const periodRevokingOrders = revokingOrders.filter((o) => {
      const d = new Date(o.received_at);
      return d >= startDate && d <= endDate;
    });

    // Cálculo das métricas financeiras reais a partir do banco
    const realGrossRevenue = approvedOrders.reduce((sum, o) => {
      const p = (o.payload as Record<string, unknown>) || {};
      const amt = Number(p.amount ?? p.originalAmount ?? 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

    const realRefundsAmount = refundedOrChargebackOrders.reduce((sum, o) => {
      const p = (o.payload as Record<string, unknown>) || {};
      const amt = Number(p.refundAmount ?? p.amount ?? 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

    const realNetRevenue = Math.max(0, realGrossRevenue - realRefundsAmount);

    // 2. Perfis reais do Supabase (profiles)
    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("id, name, email, role, access_type, subscription_status, created_at");

    if (profErr) {
      console.error("Erro ao buscar profiles:", profErr);
    }

    // Exclui admins e alunas fictícias/de teste dos indicadores
    const studentProfiles = (profiles || []).filter(
      (p) => p.role !== "admin" && !isTestEmailOrOrder(p.email, null, p.id)
    );

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

    // MRR apurado com base nas assinantes ativas pagantes (ticket médio R$ 90/mês da Vitta Pilates)
    const mrr = activeSubscribers.length * 90;

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
        hasFinancialAmountData: true,
        realGrossRevenue,
        realNetRevenue,
        realRefundsAmount,
        mrr,
        insufficientDataReason: "",
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
