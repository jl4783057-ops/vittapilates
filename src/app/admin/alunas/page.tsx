"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/store/context";
import { User, SubscriptionStatus, SubscriptionPlan } from "@/types";
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Edit2,
  Trash2,
  Mail,
  Calendar,
  Sparkles,
  UserCheck,
} from "lucide-react";

export default function AdminStudentsPage() {
  const { users, setUsers } = useApp();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filteredUsers = users.filter((u) => {
    if (statusFilter !== "todos" && u.subscriptionStatus !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  const handleUpdateStatus = (userId: string, newStatus: SubscriptionStatus) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, subscriptionStatus: newStatus } : u))
    );
    if (selectedUser?.id === userId) {
      setSelectedUser((prev) => prev ? { ...prev, subscriptionStatus: newStatus } : null);
    }
  };

  const handleUpdatePlan = (userId: string, newPlan: SubscriptionPlan) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, subscriptionPlan: newPlan } : u))
    );
    if (selectedUser?.id === userId) {
      setSelectedUser((prev) => prev ? { ...prev, subscriptionPlan: newPlan } : null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EADBCE]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
            Gestão de Alunas
          </h1>
          <p className="text-xs sm:text-sm text-[#827B77] mt-1">
            Controle de cadastro, status de assinatura, planos e progresso individual.
          </p>
        </div>
        <div className="text-xs bg-[#FFFFFF] px-3.5 py-2 rounded-2xl border border-[#EADBCE] text-[#827B77]">
          Total de Cadastradas: <strong className="text-[#292321]">{users.length}</strong>
        </div>
      </div>

      {/* Barra de Busca e Filtro de Status */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#827B77]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#EADBCE] bg-[#FFFFFF] text-xs text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[#FFFFFF] p-1 rounded-2xl border border-[#EADBCE]">
          {[
            { id: "todos", label: "Todas" },
            { id: "active", label: "Ativas" },
            { id: "trial", label: "Trial" },
            { id: "canceled", label: "Canceladas" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === st.id
                  ? "bg-[#B77D82] text-white shadow-xs"
                  : "text-[#827B77] hover:text-[#292321]"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Alunas */}
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#827B77] uppercase text-[10px] tracking-wider border-b border-[#EADBCE]">
              <tr>
                <th className="p-4">Aluna</th>
                <th className="p-4">Função</th>
                <th className="p-4">Plano</th>
                <th className="p-4">Status</th>
                <th className="p-4">Aulas Feitas</th>
                <th className="p-4">Plano do Quiz</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF7F2]">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[#FAF7F2]/50 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#F3EAE3] text-[#B77D82] font-serif font-bold flex items-center justify-center shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-[#292321]">{u.name}</p>
                        <p className="text-[11px] text-[#827B77]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-[#F3EAE3] text-[#292321]"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-[#292321]">
                    {u.subscriptionPlan || "Mensal"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        u.subscriptionStatus === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : u.subscriptionStatus === "trial"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {u.subscriptionStatus === "active"
                        ? "Ativa"
                        : u.subscriptionStatus === "trial"
                        ? "Em Teste"
                        : "Cancelada"}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="font-semibold text-[#B77D82]">
                      {u.completedLessonIds?.length || 0}
                    </span>{" "}
                    concluídas
                  </td>
                  <td className="p-4">
                    {u.customPlan ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3" />
                        Criado
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#827B77]">Pendente</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="px-3 py-1.5 rounded-xl border border-[#EADBCE] text-[#B77D82] font-semibold hover:bg-[#F7EEEE] transition"
                    >
                      Gerenciar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Gerenciamento da Aluna */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] p-6 max-w-md w-full space-y-5 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#EADBCE]">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#292321]">
                  Gerenciar Aluna
                </h3>
                <p className="text-xs text-[#827B77]">{selectedUser.name}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-[#827B77] hover:text-[#292321] text-xs font-semibold"
              >
                Fechar
              </button>
            </div>

            {/* Alterar Status */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                Status da Assinatura:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(["active", "trial", "canceled"] as SubscriptionStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(selectedUser.id, st)}
                    className={`py-2 rounded-xl font-medium transition ${
                      selectedUser.subscriptionStatus === st
                        ? "bg-[#B77D82] text-white"
                        : "bg-[#FAF7F2] text-[#292321] border border-[#EADBCE]"
                    }`}
                  >
                    {st === "active" ? "Ativa" : st === "trial" ? "Trial" : "Cancelada"}
                  </button>
                ))}
              </div>
            </div>

            {/* Alterar Plano */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                Plano Contratado:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(["Mensal", "Trimestral", "Anual"] as SubscriptionPlan[]).map((pl) => (
                  <button
                    key={pl}
                    onClick={() => handleUpdatePlan(selectedUser.id, pl)}
                    className={`py-2 rounded-xl font-medium transition ${
                      selectedUser.subscriptionPlan === pl
                        ? "bg-[#292321] text-white"
                        : "bg-[#FAF7F2] text-[#292321] border border-[#EADBCE]"
                    }`}
                  >
                    {pl}
                  </button>
                ))}
              </div>
            </div>

            {/* Informações de Quiz / Metadados */}
            <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-xs space-y-1">
              <p className="font-semibold text-[#292321]">Plano Personalizado:</p>
              <p className="text-[#827B77]">
                {selectedUser.customPlan
                  ? `Objetivo: ${selectedUser.customPlan.mainGoal} • ${selectedUser.customPlan.weeklyDays} dias/sem`
                  : "A aluna ainda não respondeu ao quiz."}
              </p>
            </div>

            <button
              onClick={() => setSelectedUser(null)}
              className="w-full py-2.5 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C]"
            >
              Salvar e Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
