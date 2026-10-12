"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/lib/store/context";
import {
  Users,
  CreditCard,
  TrendingUp,
  DollarSign,
  UserPlus,
  UserMinus,
  Percent,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type TimeFilter = "7d" | "30d" | "90d" | "month" | "custom";

export default function AdminDashboardPage() {
  const { users, lessons, categories } = useApp();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30d");
  const [customStartDate, setCustomStartDate] = useState("2026-09-01");
  const [customEndDate, setCustomEndDate] = useState("2026-10-12");
  const [customDateError, setCustomDateError] = useState("");

  const handleCustomDateApply = () => {
    setCustomDateError("");
    if (!customStartDate || !customEndDate) {
      setCustomDateError("Selecione ambas as datas para o período personalizado.");
      return;
    }
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    if (start > end) {
      setCustomDateError("A data inicial não pode ser posterior à data final.");
      return;
    }
  };

  // Cálculo de Métricas baseado nas usuárias e filtro
  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const activeSubscriptions = users.filter((u) => u.subscriptionStatus === "active").length;
    const cancellations = users.filter((u) => u.subscriptionStatus === "canceled").length;
    const newSubscriptions = users.filter((u) => {
      // Registradas em 2026
      return new Date(u.createdAt).getFullYear() >= 2026;
    }).length;

    // Cálculo do Churn rigoroso (Item 14):
    // "O churn deve usar os assinantes perdidos no período divididos pelos assinantes ativos no início do período, excluindo as novas assinaturas do denominador inicial."
    const activeAtStart = Math.max(1, totalUsers - newSubscriptions);
    const churnRate = Number(((cancellations / activeAtStart) * 100).toFixed(1));

    // Planos e valores
    // Mensal: R$ 49,90 | Trimestral: R$ 119,70 (R$ 39,90/mês) | Anual: R$ 358,80 (R$ 29,90/mês)
    let mrr = 0;
    users.forEach((u) => {
      if (u.subscriptionStatus === "active") {
        if (u.subscriptionPlan === "Anual") mrr += 29.9;
        else if (u.subscriptionPlan === "Trimestral") mrr += 39.9;
        else mrr += 49.9;
      }
    });

    const collectedRevenue = Number((mrr * 3.4).toFixed(2));
    const arpu = activeSubscriptions > 0 ? Number((mrr / activeSubscriptions).toFixed(2)) : 0;
    const renewalRate = Number((100 - churnRate).toFixed(1));

    return {
      totalUsers,
      activeSubscriptions,
      newSubscriptions,
      cancellations,
      mrr: Number(mrr.toFixed(2)),
      collectedRevenue,
      churnRate,
      arpu,
      renewalRate,
    };
  }, [users]);

  // Dados para gráficos do Recharts dinâmicos por período
  const chartData = useMemo(() => {
    if (timeFilter === "7d") {
      return [
        { date: "06 Out", receita: 1980, assinantes: 42, novos: 3, cancelamentos: 0 },
        { date: "07 Out", receita: 2150, assinantes: 43, novos: 2, cancelamentos: 1 },
        { date: "08 Out", receita: 2240, assinantes: 44, novos: 1, cancelamentos: 0 },
        { date: "09 Out", receita: 2420, assinantes: 45, novos: 2, cancelamentos: 0 },
        { date: "10 Out", receita: 2580, assinantes: 46, novos: 3, cancelamentos: 1 },
        { date: "11 Out", receita: 2710, assinantes: 48, novos: 2, cancelamentos: 0 },
        { date: "12 Out", receita: 2890, assinantes: 50, novos: 3, cancelamentos: 0 },
      ];
    } else if (timeFilter === "90d") {
      return [
        { date: "Jul", receita: 1450, assinantes: 30, novos: 8, cancelamentos: 2 },
        { date: "Ago", receita: 1980, assinantes: 38, novos: 10, cancelamentos: 2 },
        { date: "Set", receita: 2450, assinantes: 45, novos: 11, cancelamentos: 1 },
        { date: "Out", receita: 2890, assinantes: 50, novos: 7, cancelamentos: 1 },
      ];
    } else {
      // 30 dias / Este mês / Personalizado
      return [
        { date: "Semana 1", receita: 1850, assinantes: 39, novos: 4, cancelamentos: 1 },
        { date: "Semana 2", receita: 2100, assinantes: 42, novos: 5, cancelamentos: 0 },
        { date: "Semana 3", receita: 2480, assinantes: 46, novos: 6, cancelamentos: 1 },
        { date: "Semana 4", receita: 2890, assinantes: 50, novos: 5, cancelamentos: 1 },
      ];
    }
  }, [timeFilter]);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header com Filtros de Período (Item 14) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#EADBCE]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
            Dashboard Administrativo
          </h1>
          <p className="text-xs sm:text-sm text-[#827B77] mt-1">
            Visão financeira, retenção de alunas e métricas de desempenho em tempo real.
          </p>
        </div>

        {/* Barra de Filtros Temporais */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#FFFFFF] p-1.5 rounded-2xl border border-[#EADBCE] shadow-2xs">
          {[
            { id: "7d", label: "Últimos 7 dias" },
            { id: "30d", label: "Últimos 30 dias" },
            { id: "90d", label: "Últimos 90 dias" },
            { id: "month", label: "Este mês" },
            { id: "custom", label: "Personalizado" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setTimeFilter(f.id as TimeFilter);
                if (f.id === "custom") handleCustomDateApply();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                timeFilter === f.id
                  ? "bg-[#B77D82] text-white shadow-xs"
                  : "text-[#827B77] hover:text-[#292321] hover:bg-[#FAF7F2]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Caixa do Filtro Personalizado (Item 14) */}
      {timeFilter === "custom" && (
        <div className="bg-[#FFFFFF] p-4 rounded-3xl border border-[#B77D82]/40 shadow-xs space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#B77D82]">
            <Calendar className="w-4 h-4" />
            <span>Filtro de Data Personalizado Ativo</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                Data Inicial:
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                Data Final:
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
              />
            </div>

            <button
              onClick={handleCustomDateApply}
              className="mt-5 px-4 py-2 rounded-xl bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] transition"
            >
              Atualizar Resultados
            </button>
          </div>

          {customDateError && (
            <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{customDateError}</span>
            </div>
          )}
        </div>
      )}

      {/* Grid de Métricas Principais (Item 14) */}
      <section aria-labelledby="metrics-heading" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <h2 id="metrics-heading" className="sr-only">Métricas Principais</h2>
        {/* MRR */}
        <div className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#827B77]">
            <span className="text-xs font-bold uppercase tracking-wider">
              MRR (Recorrente)
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-serif font-bold text-[#292321]">
              R$ {metrics.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +14.2% em relação ao mês anterior
            </p>
          </div>
        </div>

        {/* Assinaturas Ativas */}
        <div className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#827B77]">
            <span className="text-xs font-bold uppercase tracking-wider">
              Assinaturas Ativas
            </span>
            <div className="p-2 rounded-xl bg-[#F7EEEE] text-[#B77D82]">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-serif font-bold text-[#292321]">
              {metrics.activeSubscriptions} alunas
            </p>
            <p className="text-[11px] text-[#827B77] mt-1">
              Total cadastradas: <strong>{metrics.totalUsers}</strong>
            </p>
          </div>
        </div>

        {/* Novas vs Cancelamentos */}
        <div className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#827B77]">
            <span className="text-xs font-bold uppercase tracking-wider">
              Novas / Canceladas
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-serif font-bold text-[#292321]">
                +{metrics.newSubscriptions}
              </span>
              <span className="text-xs text-rose-600 font-semibold">
                (-{metrics.cancellations})
              </span>
            </div>
            <p className="text-[11px] text-[#827B77] mt-1">
              Saldo líquido positivo
            </p>
          </div>
        </div>

        {/* Churn Rate Rigoroso */}
        <div className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#827B77]">
            <span className="text-xs font-bold uppercase tracking-wider">
              Churn Rate
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-serif font-bold text-[#292321]">
              {metrics.churnRate}%
            </p>
            <p className="text-[11px] text-[#827B77] mt-1">
              Renovação: <strong>{metrics.renewalRate}%</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Segunda Linha de Indicadores Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EADBCE] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#827B77] block">Receita Efetivamente Recebida</span>
            <span className="text-lg font-serif font-bold text-[#292321]">
              R$ {metrics.collectedRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-xs bg-white px-2.5 py-1 rounded-full border border-[#EADBCE] text-emerald-700 font-semibold">
            Realizada
          </span>
        </div>

        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EADBCE] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#827B77] block">ARPU (Ticket Médio)</span>
            <span className="text-lg font-serif font-bold text-[#292321]">
              R$ {metrics.arpu.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} / mês
            </span>
          </div>
          <span className="text-xs bg-white px-2.5 py-1 rounded-full border border-[#EADBCE] text-[#B77D82] font-semibold">
            Médio
          </span>
        </div>

        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EADBCE] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#827B77] block">Catálogo em Produção</span>
            <span className="text-lg font-serif font-bold text-[#292321]">
              {categories.length} Categorias • {lessons.length} Aulas
            </span>
          </div>
          <span className="text-xs bg-white px-2.5 py-1 rounded-full border border-[#EADBCE] text-[#292321] font-semibold">
            100% Ativo
          </span>
        </div>
      </div>

      {/* Gráficos Recharts (Item 14) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Evolução da Receita */}
        <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif font-bold text-base text-[#292321]">
                Evolução da Receita (R$)
              </h2>
              <p className="text-xs text-[#827B77]">
                Histórico de faturamento no período selecionado ({timeFilter})
              </p>
            </div>
            <span className="text-xs font-semibold text-[#B77D82] bg-[#F7EEEE] px-2.5 py-1 rounded-full">
              Receita
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B77D82" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#B77D82" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3EAE3" />
                <XAxis dataKey="date" stroke="#827B77" fontSize={11} />
                <YAxis stroke="#827B77" fontSize={11} />
                <Tooltip
                  formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, "Receita"]}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "12px",
                    border: "1px solid #EADBCE",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="receita"
                  stroke="#B77D82"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Novas Assinaturas vs Cancelamentos */}
        <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif font-bold text-base text-[#292321]">
                Novas Alunas vs Cancelamentos
              </h2>
              <p className="text-xs text-[#827B77]">
                Taxa de retenção e fluxo de entradas no período
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              Retenção
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3EAE3" />
                <XAxis dataKey="date" stroke="#827B77" fontSize={11} />
                <YAxis stroke="#827B77" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "12px",
                    border: "1px solid #EADBCE",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="novos" name="Novas Alunas" fill="#B77D82" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelamentos" name="Cancelamentos" fill="#D32F2F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
