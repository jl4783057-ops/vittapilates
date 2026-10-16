"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Percent,
  RefreshCw,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
  Gift,
  AlertCircle,
} from "lucide-react";

type TimeFilter = "7d" | "30d" | "90d" | "month" | "custom";

function dateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

interface ApiMetricsData {
  configured: boolean;
  gateway: {
    name: string;
    status: "active" | "not_configured";
    webhookUrl: string;
  };
  metrics: {
    totalApprovedPurchases: number;
    activeSubscribers: number;
    canceledSubscribers: number;
    totalCourtesies: number;
    activeCourtesies: number;
    periodApprovedPurchases: number;
    periodNewSubscribers: number;
    periodCancellationsOrRefunds: number;
    hasFinancialAmountData: boolean;
    realGrossRevenue: number | null;
    insufficientDataReason: string;
  };
  period: {
    start: string;
    end: string;
  };
}

export default function AdminDashboardPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30d");
  const [customStartDate, setCustomStartDate] = useState(() =>
    dateInputValue(new Date(Date.now() - 29 * 86_400_000)),
  );
  const [customEndDate, setCustomEndDate] = useState(() => dateInputValue(new Date()));
  const [appliedCustomStart, setAppliedCustomStart] = useState(() =>
    dateInputValue(new Date(Date.now() - 29 * 86_400_000)),
  );
  const [appliedCustomEnd, setAppliedCustomEnd] = useState(() => dateInputValue(new Date()));
  const [customDateError, setCustomDateError] = useState("");
  const [customAppliedSuccess, setCustomAppliedSuccess] = useState(false);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiMetricsData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Calcula intervalo de datas para o filtro ativo
  const getFilterRange = useCallback(() => {
    const now = new Date();
    let start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (timeFilter === "7d") {
      start.setDate(start.getDate() - 6);
    } else if (timeFilter === "30d") {
      start.setDate(start.getDate() - 29);
    } else if (timeFilter === "90d") {
      start.setDate(start.getDate() - 89);
    } else if (timeFilter === "month") {
      start.setDate(1);
    } else {
      const customStart = new Date(`${appliedCustomStart}T00:00:00`);
      const customEnd = new Date(`${appliedCustomEnd}T23:59:59.999`);
      if (!Number.isNaN(customStart.getTime())) start = customStart;
      if (!Number.isNaN(customEnd.getTime())) end.setTime(customEnd.getTime());
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, [timeFilter, appliedCustomStart, appliedCustomEnd]);

  // Carrega métricas reais do backend (Supabase + Cakto)
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { start, end } = getFilterRange();
      const res = await fetch(`/api/admin/metrics?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      if (!res.ok) {
        throw new Error("Não foi possível carregar as métricas reais do servidor.");
      }
      const json: ApiMetricsData = await res.json();
      setData(json);
    } catch (err) {
      setFetchError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getFilterRange]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const applyCustomPeriod = () => {
    setCustomDateError("");
    setCustomAppliedSuccess(false);

    if (!customStartDate || !customEndDate) {
      setCustomDateError("Selecione a data inicial e a data final.");
      return;
    }

    const start = new Date(`${customStartDate}T00:00:00`);
    const end = new Date(`${customEndDate}T23:59:59.999`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setCustomDateError("Datas inválidas.");
      return;
    }

    if (start > end) {
      setCustomDateError("A data inicial precisa ser anterior ou igual à data final.");
      return;
    }

    setAppliedCustomStart(customStartDate);
    setAppliedCustomEnd(customEndDate);
    setCustomAppliedSuccess(true);
    setTimeout(() => setCustomAppliedSuccess(false), 3000);
  };

  const m = data?.metrics || {
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
    insufficientDataReason: "",
  };

  const summaryCards = [
    {
      title: "Compras aprovadas",
      value: m.totalApprovedPurchases.toLocaleString("pt-BR"),
      badge: "Total acumulado",
      note: `No período selecionado: ${m.periodApprovedPurchases} compras confirmadas.`,
      icon: CreditCard,
    },
    {
      title: "Alunas com acesso ativo",
      value: m.activeSubscribers.toLocaleString("pt-BR"),
      badge: "Assinantes pagantes",
      note: "Perfis com acesso ativo de assinatura paga (exclui cortesias).",
      icon: Users,
    },
    {
      title: "Novas compras no período",
      value: m.periodApprovedPurchases.toLocaleString("pt-BR"),
      badge: "No período selecionado",
      note: "Total de novas transações aprovadas no intervalo de datas.",
      icon: UserPlus,
    },
    {
      title: "Cancelamentos e estornos",
      value: m.periodCancellationsOrRefunds.toLocaleString("pt-BR"),
      badge: "No período selecionado",
      note: `Total de assinaturas canceladas acumulado: ${m.canceledSubscribers}.`,
      icon: UserMinus,
    },
  ];

  const financialIndicators = [
    {
      title: "MRR (receita recorrente)",
      value: "—",
      status: "insuficiente",
      badge: "Pós-lançamento",
      note: "Calculado a partir do montante das assinaturas ativas nos primeiros ciclos de cobrança.",
      icon: DollarSign,
    },
    {
      title: "Receita recebida líquida",
      value: "—",
      status: "insuficiente",
      badge: "Pós-lançamento",
      note: "Consolidará o total financeiro líquido das transações confirmadas.",
      icon: DollarSign,
    },
    {
      title: "Taxa de churn",
      value: "—",
      status: "insuficiente",
      badge: "Em consolidação",
      note: "Mapeia a relação entre cancelamentos e base ativa após os primeiros meses.",
      icon: Percent,
    },
    {
      title: "Crescimento financeiro",
      value: "—",
      status: "insuficiente",
      badge: "Em consolidação",
      note: "Comparativo percentual de evolução em relação ao mês anterior.",
      icon: TrendingUp,
    },
    {
      title: "ARPU (ticket médio)",
      value: "—",
      status: "insuficiente",
      badge: "Pós-lançamento",
      note: "Média de faturamento por aluna ativa apurada nos ciclos de faturamento.",
      icon: DollarSign,
    },
    {
      title: "Taxa de renovação",
      value: "—",
      status: "insuficiente",
      badge: "Ciclos futuros",
      note: "Percentual de contratos renovados após o término do período contratado.",
      icon: RefreshCw,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7 animate-fade-in">
      {/* Top Header com Filtros de Período */}
      <header className="flex flex-col gap-4 border-b border-[#EADBCE] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#B77D82] font-semibold">
            Visão Geral do Negócio
          </span>
          <h1 className="font-serif text-2xl font-bold text-[#292321] sm:text-3xl mt-0.5">
            Dashboard Administrativo
          </h1>
          <p className="mt-1 text-sm text-[#827B77]">
            Acompanhe o desempenho de vendas, assinantes ativas e engajamento da plataforma.
          </p>
        </div>

        {/* Filtros de período funcionais */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#EADBCE] bg-white p-1.5 shadow-xs">
          {[
            { id: "7d", label: "7 dias" },
            { id: "30d", label: "30 dias" },
            { id: "90d", label: "90 dias" },
            { id: "month", label: "Este mês" },
            { id: "custom", label: "Personalizado" },
          ].map((period) => (
            <button
              key={period.id}
              type="button"
              onClick={() => {
                setTimeFilter(period.id as TimeFilter);
                setCustomDateError("");
              }}
              aria-pressed={timeFilter === period.id}
              className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold transition ${
                timeFilter === period.id
                  ? "bg-[#B77D82] text-white shadow-xs"
                  : "text-[#827B77] hover:bg-[#FAF7F2] hover:text-[#292321]"
              }`}
            >
              {period.label}
            </button>
          ))}
          <button
            type="button"
            onClick={fetchMetrics}
            title="Atualizar dados do servidor"
            aria-label="Atualizar dados do servidor"
            className="p-2 rounded-xl text-[#827B77] hover:text-[#292321] hover:bg-[#FAF7F2] transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#B77D82]" : ""}`} />
          </button>
        </div>
      </header>

      {/* Caixa de período personalizado quando selecionado */}
      {timeFilter === "custom" && (
        <section
          className="space-y-3 rounded-3xl border border-[#B77D82]/40 bg-white p-5 shadow-xs animate-fade-in"
          aria-label="Filtro de período personalizado"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#B77D82]">
              <Calendar className="h-4 w-4" />
              <span>Filtrar por período personalizado</span>
            </div>
            {customAppliedSuccess && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Período aplicado com sucesso!
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3.5">
            <label className="space-y-1 text-[11px] font-semibold uppercase text-[#827B77]">
              <span className="block">Data inicial</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
                suppressHydrationWarning
                className="block cursor-pointer rounded-xl border border-[#EADBCE] bg-[#FAF7F2] px-3.5 py-2 text-sm font-normal normal-case text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50"
              />
            </label>
            <label className="space-y-1 text-[11px] font-semibold uppercase text-[#827B77]">
              <span className="block">Data final</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
                suppressHydrationWarning
                className="block cursor-pointer rounded-xl border border-[#EADBCE] bg-[#FAF7F2] px-3.5 py-2 text-sm font-normal normal-case text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50"
              />
            </label>
            <button
              type="button"
              onClick={applyCustomPeriod}
              className="cursor-pointer rounded-xl bg-[#B77D82] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#A3676C] active:scale-[0.98]"
            >
              Atualizar indicadores
            </button>
          </div>

          {customDateError && (
            <p className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {customDateError}
            </p>
          )}
        </section>
      )}

      {fetchError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* 4 Indicadores principais baseados em dados reais */}
      <section aria-label="Indicadores principais" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.title}
              className="flex min-h-44 flex-col justify-between rounded-3xl border border-[#EADBCE] bg-white p-5 shadow-xs transition hover:border-[#B77D82]/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#827B77]">{card.title}</h2>
                  <span className="inline-block mt-1 text-[10px] bg-stone-100 text-[#827B77] border border-stone-200 px-2 py-0.5 rounded-full font-medium">
                    {card.badge}
                  </span>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F7EEEE] text-[#B77D82]">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="pt-3">
                <p className="font-serif text-3xl font-bold text-[#292321]">{card.value}</p>
                <p className="mt-1 text-xs text-[#827B77] leading-relaxed">{card.note}</p>
              </div>
            </article>
          );
        })}
      </section>

      {/* Destaque separado para Cortesias de Influenciadoras */}
      <section className="bg-white rounded-3xl border border-[#EADBCE] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-3 rounded-2xl bg-[#F7EEEE] text-[#B77D82]">
            <Gift className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[#292321]">
              Cortesias para Influenciadoras (Contabilizadas Separadamente)
            </h3>
            <p className="text-xs text-[#827B77]">
              Cortesias não são contabilizadas como compras nem como receita paga.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-[#FAF7F2] border border-[#EADBCE] px-3.5 py-2 rounded-xl text-center">
            <span className="text-[10px] text-[#827B77] block uppercase font-bold">Ativas</span>
            <strong className="text-sm text-[#292321]">{m.activeCourtesies}</strong>
          </div>
          <div className="bg-[#FAF7F2] border border-[#EADBCE] px-3.5 py-2 rounded-xl text-center">
            <span className="text-[10px] text-[#827B77] block uppercase font-bold">Total Concedidas</span>
            <strong className="text-sm text-[#292321]">{m.totalCourtesies}</strong>
          </div>
        </div>
      </section>

      {/* Seção Indicadores Financeiros e de Recorrência */}
      <section
        className="rounded-3xl border border-[#EADBCE] bg-white p-6 shadow-xs sm:p-7 space-y-6"
        aria-labelledby="financial-recurrence-heading"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#EADBCE] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="financial-recurrence-heading"
                className="font-serif text-xl font-bold text-[#292321] sm:text-2xl"
              >
                Indicadores Financeiros de Recorrência
              </h2>
              <span className="rounded-full bg-[#FAF7F2] border border-[#EADBCE] px-3 py-1 text-[11px] font-semibold text-[#B77D82]">
                Métricas de Negócio
              </span>
            </div>
            <p className="text-xs text-[#827B77] mt-1">
              Indicadores com cálculo restrito a dados efetivamente persistidos no Supabase.
            </p>
          </div>
          <span className="w-fit rounded-full bg-stone-100 text-[#827B77] border border-stone-200 px-3 py-1 text-xs font-medium">
            Transparência de métricas
          </span>
        </div>

        <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {financialIndicators.map((indicator) => {
            const Icon = indicator.icon;

            return (
              <article
                key={indicator.title}
                className="flex flex-col justify-between rounded-2xl border border-[#EADBCE]/80 bg-[#FAF7F2]/60 p-4 transition hover:bg-white hover:border-[#B77D82]/40"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#EADBCE] text-[#B77D82]">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="rounded bg-stone-100 border border-stone-200 text-[#827B77] px-1.5 py-0.5 text-[10px] font-medium">
                      {indicator.badge}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-[#292321] line-clamp-2 min-h-[32px]">
                    {indicator.title}
                  </h3>
                </div>

                <div className="pt-3">
                  <p className="font-serif text-base font-bold text-[#827B77]">
                    {indicator.value}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#827B77]">
                    {indicator.note}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
