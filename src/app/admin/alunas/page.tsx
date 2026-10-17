"use client";

import React, { useState, useEffect, useCallback } from "react";
import { User, SubscriptionStatus, SubscriptionPlan } from "@/types";
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Gift,
  KeyRound,
  Mail,
} from "lucide-react";
import ImageUploadField from "@/components/ui/ImageUploadField";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/students");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Não foi possível carregar as alunas do Supabase.");
      }
      const data = await res.json();
      setStudents(Array.isArray(data.students) ? data.students : []);
    } catch (err) {
      console.error("Falha ao buscar alunas:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filteredUsers = students.filter((u) => {
    if (statusFilter !== "todos" && u.subscriptionStatus !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  const handleUpdateStudent = async (userId: string, fields: Partial<User>) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, ...fields }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erro ao atualizar aluna no Supabase.");
      }

      const updated = data.student as User;
      setStudents((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      if (selectedUser?.id === userId) {
        setSelectedUser(updated);
      }

      setToastMessage({ type: "success", text: "Dados da aluna atualizados e persistidos no Supabase!" });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("Erro ao atualizar aluna:", err);
      setToastMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao atualizar." });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGeneratePasswordLink = async (email: string) => {
    setGeneratingLink(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_password_link", email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar link de acesso.");
      if (data.link) {
        await navigator.clipboard.writeText(data.link);
        setCopiedLink(true);
        setToastMessage({ type: "success", text: "Link de acesso gerado e copiado para a área de transferência!" });
        setTimeout(() => {
          setCopiedLink(false);
          setToastMessage(null);
        }, 4000);
      }
    } catch (err) {
      console.error("Erro ao gerar link:", err);
      setToastMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao gerar link." });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleResendEmail = async (email: string, name: string) => {
    setResendingEmail(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend_invite_email", email, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao reenviar e-mail de acesso.");
      if (data.emailSent) {
        setToastMessage({ type: "success", text: "E-mail de acesso enviado com sucesso via Resend!" });
      } else {
        setToastMessage({
          type: "error",
          text: `Falha no envio do e-mail (${data.error || "provedor recusou o destinatário"}). Use a opção de copiar link.`,
        });
      }
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error("Erro ao reenviar e-mail:", err);
      setToastMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao reenviar." });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {toastMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs ${
            toastMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="text-[#827B77] hover:text-[#292321]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EADBCE]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
            Gestão de Alunas
          </h1>
          <p className="text-xs sm:text-sm text-[#827B77] mt-1">
            Controle de cadastro, status de acesso e histórico real persistido no Supabase.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStudents}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-[#EADBCE] bg-[#FFFFFF] text-xs font-semibold text-[#827B77] hover:text-[#292321] transition cursor-pointer"
            title="Atualizar lista do banco"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#B77D82]" : ""}`} />
            <span>Atualizar</span>
          </button>
          <div className="text-xs bg-[#FFFFFF] px-3.5 py-2 rounded-2xl border border-[#EADBCE] text-[#827B77]">
            Total Cadastradas: <strong className="text-[#292321]">{students.length}</strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
            { id: "inactive", label: "Inativas" },
            { id: "canceled", label: "Canceladas" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition cursor-pointer ${
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

      {/* Tabela de Alunas Reais */}
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#827B77] uppercase text-[10px] tracking-wider border-b border-[#EADBCE]">
              <tr>
                <th className="p-4">Aluna</th>
                <th className="p-4">Tipo de Acesso</th>
                <th className="p-4">Plano</th>
                <th className="p-4">Status</th>
                <th className="p-4">Cadastro</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF7F2]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#827B77]">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#B77D82]" />
                      <span>Consultando alunas reais no Supabase...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#827B77]">
                    {students.length === 0
                      ? "Nenhuma aluna cadastrada no banco de dados até o momento."
                      : "Nenhuma aluna encontrada com os filtros selecionados."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSubscriber = u.accessType === "subscriber";
                  const isCourtesy = u.accessType === "courtesy";

                  return (
                    <tr key={u.id} className="hover:bg-[#FAF7F2]/50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#FAF7F2] border border-[#EADBCE] overflow-hidden shrink-0 flex items-center justify-center font-bold text-[#B77D82]">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              u.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[#292321]">{u.name}</p>
                            <p className="text-[11px] text-[#827B77]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {isSubscriber ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Assinante
                          </span>
                        ) : isCourtesy ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Gift className="w-3 h-3 text-amber-600" /> Cortesia
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF7F2] text-[#827B77] border border-[#EADBCE]">
                            Sem Acesso
                          </span>
                        )}
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
                              : "bg-stone-100 text-[#827B77]"
                          }`}
                        >
                          {u.subscriptionStatus === "active"
                            ? "Ativa"
                            : u.subscriptionStatus === "trial"
                            ? "Em Teste"
                            : u.subscriptionStatus === "canceled"
                            ? "Cancelada"
                            : "Inativa"}
                        </span>
                      </td>
                      <td className="p-4 text-[11px] text-[#827B77]">
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="px-3 py-1.5 rounded-xl border border-[#EADBCE] text-[#B77D82] font-semibold hover:bg-[#F7EEEE] transition cursor-pointer"
                        >
                          Gerenciar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Gerenciamento da Aluna */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] p-6 max-w-md w-full space-y-5 shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EADBCE]">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#292321]">
                  Gerenciar Aluna
                </h3>
                <p className="text-xs text-[#827B77]">{selectedUser.name}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-[#827B77] hover:text-[#292321] text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>

            {/* Foto de Perfil */}
            <ImageUploadField
              label="Foto de Perfil da Aluna"
              value={selectedUser.avatarUrl || ""}
              onChange={(url) => handleUpdateStudent(selectedUser.id, { avatarUrl: url })}
              aspectRatio="square"
              helperText="Foto de perfil da usuária salva no Supabase Storage (JPG, PNG ou WebP até 5MB)."
            />

            {/* Alterar Status */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                Status da Assinatura:
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {(["active", "trial", "inactive", "canceled"] as SubscriptionStatus[]).map((st) => (
                  <button
                    key={st}
                    disabled={isUpdating}
                    onClick={() => handleUpdateStudent(selectedUser.id, { subscriptionStatus: st })}
                    className={`py-2 rounded-xl font-medium transition cursor-pointer disabled:opacity-50 ${
                      selectedUser.subscriptionStatus === st
                        ? "bg-[#B77D82] text-white"
                        : "bg-[#FAF7F2] text-[#292321] border border-[#EADBCE]"
                    }`}
                  >
                    {st === "active" ? "Ativa" : st === "trial" ? "Trial" : st === "inactive" ? "Inativa" : "Cancelada"}
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
                    disabled={isUpdating}
                    onClick={() => handleUpdateStudent(selectedUser.id, { subscriptionPlan: pl })}
                    className={`py-2 rounded-xl font-medium transition cursor-pointer disabled:opacity-50 ${
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

            {/* Tipo de Acesso */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                Tipo de Acesso (Permissão):
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(["none", "subscriber", "courtesy"] as const).map((acc) => (
                  <button
                    key={acc}
                    disabled={isUpdating}
                    onClick={() => handleUpdateStudent(selectedUser.id, { accessType: acc })}
                    className={`py-2 rounded-xl font-medium transition cursor-pointer disabled:opacity-50 ${
                      selectedUser.accessType === acc
                        ? "bg-[#B77D82] text-white"
                        : "bg-[#FAF7F2] text-[#292321] border border-[#EADBCE]"
                    }`}
                  >
                    {acc === "subscriber" ? "Assinante" : acc === "courtesy" ? "Cortesia" : "Nenhum"}
                  </button>
                ))}
              </div>
            </div>

            {/* Ação de Segurança: Gerar Link de Primeiro Acesso e Reenviar E-mail */}
            <div className="pt-2 border-t border-[#EADBCE] space-y-2.5">
              <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                Acesso e Definição de Senha:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={resendingEmail}
                  onClick={() => handleResendEmail(selectedUser.email, selectedUser.name)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] text-[#292321] hover:bg-[#F7EEEE] hover:text-[#B77D82] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {resendingEmail ? "Enviando..." : "Reenviar E-mail"}
                </button>
                <button
                  type="button"
                  disabled={generatingLink}
                  onClick={() => handleGeneratePasswordLink(selectedUser.email)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-[#B77D82] text-[#B77D82] bg-[#FAF7F2] hover:bg-[#F7EEEE] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {generatingLink
                    ? "Gerando link..."
                    : copiedLink
                    ? "✓ Copiado!"
                    : "Copiar Link"}
                </button>
              </div>
              <p className="text-[10px] text-[#827B77] leading-relaxed">
                Dispara o e-mail oficial via Resend ou copia o link direto com token de definição de senha para atendimento via WhatsApp.
              </p>
            </div>

            <button
              onClick={() => setSelectedUser(null)}
              className="w-full py-2.5 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] cursor-pointer"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
