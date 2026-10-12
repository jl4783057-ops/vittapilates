"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/store/context";
import { CreditCard, CheckCircle2, Clock, XCircle, Search, DollarSign } from "lucide-react";

export default function AdminSubscriptionsPage() {
  const { users } = useApp();
  const [filterPlan, setFilterPlan] = useState<string>("todos");

  const subscriptions = users.map((u) => {
    let price = 49.9;
    if (u.subscriptionPlan === "Trimestral") price = 119.7;
    if (u.subscriptionPlan === "Anual") price = 358.8;

    return {
      id: `sub-${u.id}`,
      user: u,
      plan: u.subscriptionPlan || "Mensal",
      status: u.subscriptionStatus,
      price,
      renewalDate: u.subscriptionRenewalDate || "2026-11-15",
    };
  });

  const filtered = subscriptions.filter((s) => {
    if (filterPlan !== "todos" && s.plan !== filterPlan) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EADBCE]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
            Gestão de Assinaturas
          </h1>
          <p className="text-xs sm:text-sm text-[#827B77] mt-1">
            Controle de contratos, faturamento recorrente e planos vigentes.
          </p>
        </div>

        {/* Filtros de Plano */}
        <div className="flex items-center gap-1.5 bg-[#FFFFFF] p-1 rounded-2xl border border-[#EADBCE]">
          {["todos", "Mensal", "Trimestral", "Anual"].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPlan(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                filterPlan === p
                  ? "bg-[#B77D82] text-white shadow-xs"
                  : "text-[#827B77] hover:text-[#292321]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de Resumo dos Planos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { name: "Plano Mensal", value: "R$ 49,90/mês", active: users.filter((u) => u.subscriptionPlan === "Mensal" && u.subscriptionStatus === "active").length },
          { name: "Plano Trimestral", value: "R$ 119,70/tri", active: users.filter((u) => u.subscriptionPlan === "Trimestral" && u.subscriptionStatus === "active").length },
          { name: "Plano Anual", value: "R$ 358,80/ano", active: users.filter((u) => u.subscriptionPlan === "Anual" && u.subscriptionStatus === "active").length },
        ].map((item) => (
          <div key={item.name} className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EADBCE] shadow-2xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#827B77]">
              {item.name}
            </span>
            <p className="font-serif font-bold text-xl text-[#292321]">{item.value}</p>
            <p className="text-xs text-emerald-700 font-medium">
              {item.active} alunas ativas neste plano
            </p>
          </div>
        ))}
      </div>

      {/* Tabela de Assinaturas */}
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#827B77] uppercase text-[10px] tracking-wider border-b border-[#EADBCE]">
              <tr>
                <th className="p-4">Aluna</th>
                <th className="p-4">Plano</th>
                <th className="p-4">Valor Cobrado</th>
                <th className="p-4">Renovação</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF7F2]">
              {filtered.map((sub) => (
                <tr key={sub.id} className="hover:bg-[#FAF7F2]/50 transition">
                  <td className="p-4">
                    <p className="font-semibold text-[#292321]">{sub.user.name}</p>
                    <p className="text-[11px] text-[#827B77]">{sub.user.email}</p>
                  </td>
                  <td className="p-4 font-semibold text-[#292321]">
                    {sub.plan}
                  </td>
                  <td className="p-4 font-mono font-medium text-[#292321]">
                    R$ {sub.price.toFixed(2)}
                  </td>
                  <td className="p-4 text-[#827B77]">
                    {sub.renewalDate}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        sub.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : sub.status === "trial"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {sub.status === "active" ? "Ativa" : sub.status === "trial" ? "Trial" : "Cancelada"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
