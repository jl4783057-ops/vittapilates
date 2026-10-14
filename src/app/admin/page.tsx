"use client";

import React, { useMemo, useState } from "react";
import { useApp } from "@/lib/store/context";
import {
  AlertCircle,
  Calendar,
  CreditCard,
  DollarSign,
  Percent,
  RefreshCw,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Database,
  Webhook,
} from "lucide-react";

type TimeFilter = "7d" | "30d" | "90d" | "month" | "custom";

function dateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminDashboardPage() {
  const { users } = useApp();
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

  // ORIGEM DOS DADOS:
  // Atualmente não há gateway de pagamento (Stripe/Asaas/Kiwify) conectado.
  // Os dados vêm exclusivamente do estado local `users` gerenciado no LocalStorage do navegador.
  // - Usuárias cadastradas: contagem de contas com perfil "aluna".
  // - Assinaturas ativas: usuárias com o campo local `subscriptionStatus === "active"`.
  // - Novas assinaturas: usuárias cadastradas cuja data `createdAt` recai no intervalo do filtro selecionado.
  // - Cancelamentos: usuárias com `subscriptionStatus === "canceled"`.
  // - MRR Estimado: soma teórica dos preços de tabela (Anual: R$ 29,90, Trimestral: R$ 39,90, Mensal: R$ 49,90) multiplicados pelas assinaturas ativas locais.
  // - ARPU Estimado: MRR estimado dividido pelas assinaturas ativas locais.
  // - Receita recebida, Churn, Crescimento e Taxa de Renovação: exibem "—" pois exigem histórico bancário e webhooks de conciliação.
  const metrics = useMemo(() => {
    const students = users.filter((user) => user.role !== "admin");
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

    const studentsInRange = students.filter((user) => {
      const createdAt = new Date(user.createdAt);
      return createdAt >= start && createdAt <= end;
    });

    const activeSubscriptions = students.filter((user) => user.subscriptionStatus === "active");

    const monthlyPrice = (plan: string) =>
      plan === "Anual" ? 29.9 : plan === "Trimestral" ? 39.9 : 49.9;

    const estimatedMrr = activeSubscriptions.reduce(
      (total, user) => total + monthlyPrice(user.subscriptionPlan),
      0,
    );

    return {
      registeredUsers: students.length,
      activeSubscriptions: activeSubscriptions.length,
      newSubscriptionsInPeriod: studentsInRange.filter(
        (user) => user.subscriptionStatus === "active" || user.subscriptionStatus === "trial",
      ).length,
      canceledSubscriptions: students.filter((user) => user.subscriptionStatus === "canceled").length,
      estimatedMrr,
      estimatedArpu: activeSubscriptions.length ? estimatedMrr / activeSubscriptions.length : 0,
      startDate: start,
      endDate: end,
    };
  }, [users, timeFilter, appliedCustomStart, appliedCustomEnd]);

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

  const summaryCards = [
    {
      title: "Usuárias cadastradas",
      value: metrics.registeredUsers.toLocaleString("pt-BR"),
      badge: "Dado Local / Demo",
      note: "Total de alunas salvas no LocalStorage",
      icon: Users,
    },
    {
      title: "Assinaturas ativas",
      value: metrics.activeSubscriptions.toLocaleString("pt-BR"),
      badge: "Dado Local / Demo",
      note: "Status ativo registrado localmente",
      icon: CreditCard,
    },
    {
      title: "Novas assinaturas no período selecionado",
      value: metrics.newSubscriptionsInPeriod.toLocaleString("pt-BR"),
      badge: "Dado Local / Demo",
      note: "Cadastros locais com data no período filtrado",
      icon: UserPlus,
    },
    {
      title: "Cancelamentos",
      value: metrics.canceledSubscriptions.toLocaleString("pt-BR"),
      badge: "Dado Local / Demo",
      note: "Status cancelado nos cadastros locais",
      icon: UserMinus,
    },
  ];

  const financialIndicators = [
    {
      title: "MRR (receita recorrente mensal)",
      value: formatCurrency(metrics.estimatedMrr),
      status: "estimado",
      badge: "Estimativa Teórica",
      note: "Soma teórica por plano das alunas ativas locais (R$ 29,90 a R$ 49,90). Não reflete cobrança real.",
      icon: DollarSign,
    },
    {
      title: "Receita recebida",
      value: "—",
      status: "pendente",
      badge: "Não Integrado",
      note: "Requer gateway de pagamentos conectado para liquidar transações reais (cartão/Pix).",
      icon: DollarSign,
    },
    {
      title: "Taxa de churn",
      value: "—",
      status: "pendente",
      badge: "Não Integrado",
      note: "Requer histórico mensal de cancelamentos processados por faturamento real.",
      icon: Percent,
    },
    {
      title: "Crescimento",
      value: "—",
      status: "pendente",
      badge: "Não Integrado",
      note: "Requer comparação com receita consolidada de meses anteriores.",
      icon: TrendingUp,
    },
    {
      title: "ARPU",
      value: formatCurrency(metrics.estimatedArpu),
      status: "estimado",
      badge: "Estimativa Teórica",
      note: "Média estimada (MRR estimado ÷ ativas locais). Depende de receita real.",
      icon: DollarSign,
    },
    {
      title: "Taxa de renovação",
      value: "—",
      status: "pendente",
      badge: "Não Integrado",
      note: "Requer captura de webhooks de ciclos de renovação automática do gateway.",
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
            Acompanhe a base de alunas, adesões no período e indicadores financeiros de recorrência.
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

      {/* Identificação de Status e Origem dos Dados */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs leading-relaxed text-amber-900">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div className="space-y-1">
            <p>
              <strong className="font-semibold text-amber-950">Status da Integração de Pagamentos:</strong>{" "}
              <strong>Ainda não há integração de pagamentos configurada</strong> neste projeto (sem gateway como Asaas, Stripe ou Kiwify conectado).
            </p>
            <p className="text-amber-800">
              Os números abaixo refletem <strong>dados de demonstração locais</strong> armazenados no navegador. Métricas de faturamento real (receita recebida, churn, crescimento e taxa de renovação) estão sinalizadas como <strong>“—”</strong> para evitar exibir informações fictícias como se fossem transações bancárias reais.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Indicadores principais no topo */}
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
                  <span className="inline-block mt-1 text-[10px] bg-[#FAF7F2] text-[#827B77] border border-[#EADBCE] px-2 py-0.5 rounded-full font-medium">
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

      {/* Seção Indicadores Financeiros de Recorrência */}
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
                SaaS Recorrência
              </span>
            </div>
            <p className="text-xs text-[#827B77] mt-1">
              Métricas essenciais para acompanhamento do faturamento recorrente e saúde da assinatura.
            </p>
          </div>
          <span className="w-fit rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 text-xs font-medium">
            Integração de pagamento pendente
          </span>
        </div>

        <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {financialIndicators.map((indicator) => {
            const Icon = indicator.icon;
            const isEstimated = indicator.status === "estimado";

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
                    {isEstimated ? (
                      <span className="rounded bg-[#EBD6D5] text-[#292321] px-1.5 py-0.5 text-[10px] font-semibold">
                        {indicator.badge}
                      </span>
                    ) : (
                      <span className="rounded bg-stone-100 border border-stone-200 text-[#827B77] px-1.5 py-0.5 text-[10px] font-medium">
                        {indicator.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-semibold text-[#292321] line-clamp-2 min-h-[32px]">
                    {indicator.title}
                  </h3>
                </div>

                <div className="pt-3">
                  <p className="font-serif text-2xl font-bold text-[#292321]">
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

      {/* Painel Explicativo: O que falta para dados reais */}
      <section className="rounded-3xl border border-[#EADBCE] bg-[#FFFFFF] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-[#292321]">
          <HelpCircle className="w-5 h-5 text-[#B77D82]" />
          <h2 className="font-serif font-bold text-lg">
            Como conectar dados reais de faturamento e assinaturas
          </h2>
        </div>
        <p className="text-xs text-[#827B77] leading-relaxed">
          Para que o dashboard exiba transações financeiras reais sem depender de dados locais de demonstração, o projeto necessita de três componentes de infraestrutura:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#292321]">
              <CreditCard className="w-4 h-4 text-[#B77D82]" />
              <h3>1. Gateway de Cobrança</h3>
            </div>
            <p className="text-[11px] text-[#827B77] leading-relaxed">
              Conta ativa em um gateway como <strong>Asaas</strong>, <strong>Stripe</strong> ou <strong>Kiwify</strong> com chaves de API para cobrança recorrente via Cartão de Crédito e Pix.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#292321]">
              <Webhook className="w-4 h-4 text-[#B77D82]" />
              <h3>2. Webhooks Server-Side</h3>
            </div>
            <p className="text-[11px] text-[#827B77] leading-relaxed">
              Rota de API (ex.: <code className="text-[#B77D82] font-mono">/api/webhooks/pagamentos</code>) recebendo notificações instantâneas de pagamento confirmado, renovação ou cancelamento.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#292321]">
              <Database className="w-4 h-4 text-[#B77D82]" />
              <h3>3. Banco de Dados Central</h3>
            </div>
            <p className="text-[11px] text-[#827B77] leading-relaxed">
              Tabelas em banco relacional (ex.: <strong>Supabase / PostgreSQL</strong>) gravando faturas, extratos e datas de ciclo, permitindo somar MRR e calcular Churn histórico real.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
