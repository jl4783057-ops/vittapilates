"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CreditCard, Search, RefreshCw, Users, ShieldAlert } from "lucide-react";
import { User } from "@/types";

export default function AdminSubscriptionsPage() {
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPlan, setFilterPlan] = useState<string>("todos");
  const [search, setSearch] = useState<string>("");

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/students");
      if (!res.ok) {
        throw new Error("Não foi possível carregar as assinaturas.");
      }
      const data = await res.json();
      if (Array.isArray(data.students)) {
        setStudents(data.students);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Alunas com acesso via assinatura paga (exclui cortesias de influenciadoras e visitantes)
  const subscribers = students.filter((s) => s.accessType === "subscriber");

  const filtered = subscribers.filter((s) => {
    if (filterPlan !== "todos" && s.subscriptionPlan !== filterPlan) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeMonthly = subscribers.filter(
    (s) => s.subscriptionPlan === "Mensal" && (s.subscriptionStatus === "active" || s.subscriptionStatus === "trial")
  ).length;

  const activeQuarterly = subscribers.filter(
    (s) => s.subscriptionPlan === "Trimestral" && (s.subscriptionStatus === "active" || s.subscriptionStatus === "trial")
  ).length;

  const activeAnnual = subscribers.filter(
    (s) => s.subscriptionPlan === "Anual" && (s.subscriptionStatus === "active" || s.subscriptionStatus === "trial")
  ).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EADBCE]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
            Gestão de Assinaturas
          </h1>
          <p className="text-xs sm:text-sm text-[#827B77] mt-1">
            Controle de contratos ativos, planos de alunas e renovações automáticas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtros de Plano */}
          <div className="flex items-center gap-1.5 bg-[#FFFFFF] p-1 rounded-2xl border border-[#EADBCE]">
            {["todos", "Mensal", "Trimestral", "Anual"].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPlan(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition cursor-pointer ${
                  filterPlan === p
                    ? "bg-[#B77D82] text-white shadow-xs"
                    : "text-[#827B77] hover:text-[#292321]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={fetchSubscriptions}
            title="Atualizar assinaturas"
            className="p-2.5 rounded-xl bg-white border border-[#EADBCE] text-[#827B77] hover:text-[#292321] transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#B77D82]" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cards de Resumo dos Planos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { name: "Plano Mensal", active: activeMonthly },
          { name: "Plano Trimestral", active: activeQuarterly },
          { name: "Plano Anual", active: activeAnnual },
        ].map((item) => (
          <div key={item.name} className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
              {item.name}
            </span>
            <p className="font-serif font-bold text-2xl text-[#292321]">{item.active} <span className="text-sm font-sans font-normal text-[#827B77]">ativas</span></p>
            <p className="text-xs text-[#827B77] font-medium">
              Assinaturas pagantes confirmadas
            </p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#827B77]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail da assinante..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#EADBCE] bg-[#FFFFFF] text-xs text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50"
        />
      </div>

      {/* Tabela de Assinaturas Reais */}
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#827B77] flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#B77D82]" />
            <span>Consultando assinaturas no Supabase...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-[#EADBCE] flex items-center justify-center mx-auto text-[#B77D82]">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-serif font-bold text-base text-[#292321]">
                Nenhuma assinatura paga registrada
              </h3>
              <p className="text-xs text-[#827B77] leading-relaxed">
                As novas assinaturas aprovadas pelas alunas aparecerão aqui automaticamente com status, plano e data de renovação.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-[#827B77] uppercase text-[10px] tracking-wider border-b border-[#EADBCE]">
                <tr>
                  <th className="p-4">Aluna</th>
                  <th className="p-4">Plano</th>
                  <th className="p-4">Próxima Renovação</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF7F2]">
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#FAF7F2]/50 transition">
                    <td className="p-4">
                      <p className="font-semibold text-[#292321]">{sub.name}</p>
                      <p className="text-[11px] text-[#827B77]">{sub.email}</p>
                    </td>
                    <td className="p-4 font-semibold text-[#292321]">
                      {sub.subscriptionPlan || "Mensal"}
                    </td>
                    <td className="p-4 text-[#827B77]">
                      {sub.subscriptionRenewalDate
                        ? new Date(sub.subscriptionRenewalDate).toLocaleDateString("pt-BR")
                        : "Não informada"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          sub.subscriptionStatus === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : sub.subscriptionStatus === "trial"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {sub.subscriptionStatus === "active"
                          ? "Ativa"
                          : sub.subscriptionStatus === "trial"
                          ? "Trial"
                          : "Cancelada"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
