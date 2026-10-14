"use client";

import React, { useState, useEffect } from "react";
import {
  Gift,
  Plus,
  RefreshCw,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Send,
  RotateCcw,
  Ban,
  UserCheck,
} from "lucide-react";

interface CourtesyGrant {
  id: string;
  user_id?: string | null;
  name: string;
  email: string;
  duration_days: number;
  status: "invited" | "active" | "expired" | "revoked" | "converted";
  starts_at: string;
  expires_at: string;
  invite_sent_at?: string | null;
  created_by?: string | null;
  notes?: string | null;
  created_at: string;
}

export default function AdminCortesiasPage() {
  const [grants, setGrants] = useState<CourtesyGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");

  // Modal de criação
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createDays, setCreateDays] = useState(30);
  const [createNotes, setCreateNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal de renovação
  const [renewTarget, setRenewTarget] = useState<CourtesyGrant | null>(null);
  const [renewDays, setRenewDays] = useState(30);

  const fetchGrants = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cortesias");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao carregar cortesias.");
      }
      setGrants(data.grants || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrants();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cortesias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          durationDays: createDays,
          notes: createNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao conceder cortesia.");
      }
      setIsCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreateDays(30);
      setCreateNotes("");
      setActionSuccess("Cortesia concedida e convite enviado por e-mail com sucesso!");
      setTimeout(() => setActionSuccess(null), 4000);
      fetchGrants();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: "renew" | "revoke" | "resend", days?: number) => {
    try {
      const res = await fetch(`/api/admin/cortesias/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, days }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao processar ação.");
      }
      const msgMap = {
        renew: "Prazo da cortesia renovado com sucesso!",
        revoke: "Acesso de cortesia revogado.",
        resend: "Novo link de acesso e senha enviado para o e-mail!",
      };
      setActionSuccess(msgMap[action]);
      setTimeout(() => setActionSuccess(null), 3500);
      setRenewTarget(null);
      fetchGrants();
    } catch (err) {
      alert(`Erro: ${(err as Error).message}`);
    }
  };

  const filteredGrants = grants.filter((g) => {
    if (statusFilter !== "todos" && g.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q);
    }
    return true;
  });

  const getStatusBadge = (status: CourtesyGrant["status"], expiresAt: string) => {
    const isPast = new Date(expiresAt) < new Date();
    if (status === "converted") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
          <UserCheck className="w-3 h-3" />
          Virou Assinante
        </span>
      );
    }
    if (status === "expired" || (isPast && status !== "revoked")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
          <Clock className="w-3 h-3" />
          Expirado
        </span>
      );
    }
    if (status === "revoked") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700">
          <Ban className="w-3 h-3" />
          Revogado
        </span>
      );
    }
    if (status === "active") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900">
          <Sparkles className="w-3 h-3 text-amber-600" />
          Acesso Ativo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800">
        <Mail className="w-3 h-3" />
        Convite Enviado
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EADBCE]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-[#F7EEEE] text-[#B77D82]">
              <Gift className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
              Cortesias para Influenciadoras
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#827B77] mt-1">
            Conceda acesso gratuito com prazo definido, envie convites seguros via Supabase Auth e acompanhe a conversão em assinante sem cobrança pela Cakto.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchGrants}
            className="p-2.5 rounded-full border border-[#EADBCE] text-[#827B77] hover:text-[#292321] hover:bg-[#FAF7F2] transition"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Conceder Cortesia
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-2xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {actionSuccess}
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Aviso de Configuração:</p>
            <p className="text-[#827B77]">{error}</p>
            <p className="text-[11px] text-[#827B77]">
              Certifique-se de configurar <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> e <code>SUPABASE_SERVICE_ROLE_KEY</code> no arquivo <code>.env.local</code> e rodar a migração <code>src/lib/supabase/migrations/002_acesso_cortesias_cakto.sql</code>.
            </p>
          </div>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#827B77]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar influenciadora por nome ou e-mail..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#EADBCE] bg-[#FFFFFF] text-xs text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[#FFFFFF] p-1 rounded-2xl border border-[#EADBCE] overflow-x-auto">
          {[
            { id: "todos", label: "Todas" },
            { id: "active", label: "Ativas" },
            { id: "invited", label: "Convidadas" },
            { id: "expired", label: "Expiradas" },
            { id: "converted", label: "Assinantes" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
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

      {/* Tabela de Cortesias */}
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EADBCE] bg-[#FAF7F2] text-[11px] font-bold uppercase text-[#827B77]">
                <th className="p-4">Influenciadora</th>
                <th className="p-4">Status</th>
                <th className="p-4">Duração</th>
                <th className="p-4">Início</th>
                <th className="p-4">Expiração</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EADBCE] text-xs text-[#292321]">
              {loading && grants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#827B77]">
                    Carregando cortesias registradas...
                  </td>
                </tr>
              ) : filteredGrants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#827B77]">
                    Nenhuma cortesia encontrada para este filtro.
                  </td>
                </tr>
              ) : (
                filteredGrants.map((grant) => {
                  const starts = new Date(grant.starts_at).toLocaleDateString("pt-BR");
                  const expires = new Date(grant.expires_at).toLocaleDateString("pt-BR");
                  const isPast = new Date(grant.expires_at) < new Date();

                  return (
                    <tr key={grant.id} className="hover:bg-[#FAF7F2]/60 transition">
                      <td className="p-4">
                        <div className="font-semibold text-sm">{grant.name}</div>
                        <div className="text-[11px] text-[#827B77] flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#B77D82]" />
                          {grant.email}
                        </div>
                        {grant.notes && (
                          <div className="text-[10px] text-[#827B77] italic mt-0.5">
                            Obs: {grant.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-4">{getStatusBadge(grant.status, grant.expires_at)}</td>
                      <td className="p-4 font-medium">
                        {grant.duration_days} dias
                      </td>
                      <td className="p-4 text-[#827B77]">{starts}</td>
                      <td className="p-4">
                        <span className={isPast && grant.status !== "converted" ? "text-rose-600 font-semibold" : "text-[#292321]"}>
                          {expires}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => {
                              setRenewTarget(grant);
                              setRenewDays(30);
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-[#EADBCE] text-xs font-semibold text-[#B77D82] hover:bg-[#F7EEEE] transition flex items-center gap-1"
                            title="Renovar ou prorrogar prazo"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Renovar
                          </button>

                          <button
                            onClick={() => handleAction(grant.id, "resend")}
                            className="p-1.5 rounded-xl border border-[#EADBCE] text-[#827B77] hover:text-[#292321] hover:bg-[#FAF7F2] transition"
                            title="Reenviar link de definição de senha"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {grant.status !== "revoked" && grant.status !== "converted" && (
                            <button
                              onClick={() => {
                                if (confirm(`Revogar o acesso de cortesia de ${grant.name}?`)) {
                                  handleAction(grant.id, "revoke");
                                }
                              }}
                              className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 transition"
                              title="Revogar acesso imediatamente"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Conceder Nova Cortesia */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] p-6 max-w-md w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#EADBCE]">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#F7EEEE] text-[#B77D82]">
                  <Gift className="w-4 h-4" />
                </span>
                <h3 className="font-serif font-bold text-lg text-[#292321]">
                  Conceder Cortesia
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[#827B77] hover:text-[#292321] text-xs font-semibold"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Nome da Influenciadora
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gabriela Pugliesi"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  E-mail para Convite
                </label>
                <input
                  type="email"
                  required
                  placeholder="influenciadora@instagram.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Duração do Acesso Gratuito
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 60, 90].map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => setCreateDays(d)}
                      className={`py-2 rounded-xl text-xs font-semibold transition border ${
                        createDays === d
                          ? "bg-[#B77D82] text-white border-[#B77D82]"
                          : "bg-[#FAF7F2] text-[#292321] border-[#EADBCE] hover:border-[#B77D82]/50"
                      }`}
                    >
                      {d} dias
                    </button>
                  ))}
                </div>
                <div className="pt-1.5 flex items-center gap-2 text-xs">
                  <span className="text-[#827B77]">Ou outro prazo:</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={createDays}
                    onChange={(e) => setCreateDays(Number(e.target.value))}
                    className="w-20 px-2.5 py-1 rounded-lg border border-[#EADBCE] bg-[#FAF7F2] text-xs"
                  />
                  <span className="text-[#827B77]">dias</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Observações / Campanha (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Parceria Stories Abril / Cupom VITTA10"
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                />
              </div>

              <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#EADBCE] text-[11px] text-[#827B77] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#292321]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#B77D82]" />
                  Fluxo Seguro do Supabase Auth:
                </div>
                <p>
                  A influenciadora receberá um convite por e-mail com link direto para criar a senha. Se posteriormente ela assinar o plano pela Cakto, sua conta e histórico serão preservados e convertidos automaticamente para assinante.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] transition disabled:opacity-50"
                >
                  {submitting ? "Enviando Convite..." : "Confirmar e Enviar Convite"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-full border border-[#EADBCE] text-xs text-[#827B77] hover:bg-[#FAF7F2]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Renovar Cortesia */}
      {renewTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] p-6 max-w-sm w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#EADBCE]">
              <h3 className="font-serif font-bold text-base text-[#292321]">
                Renovar Prazo de Cortesia
              </h3>
              <button
                onClick={() => setRenewTarget(null)}
                className="text-[#827B77] text-xs"
              >
                Fechar
              </button>
            </div>

            <p className="text-xs text-[#827B77]">
              Adicione mais dias ao acesso de <strong>{renewTarget.name}</strong> ({renewTarget.email}).
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                Dias Adicionais
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[15, 30, 60].map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setRenewDays(d)}
                    className={`py-2 rounded-xl text-xs font-semibold border ${
                      renewDays === d
                        ? "bg-[#B77D82] text-white border-[#B77D82]"
                        : "bg-[#FAF7F2] text-[#292321] border-[#EADBCE]"
                    }`}
                  >
                    +{d} dias
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleAction(renewTarget.id, "renew", renewDays)}
                className="flex-1 py-2.5 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C]"
              >
                Confirmar Renovação
              </button>
              <button
                type="button"
                onClick={() => setRenewTarget(null)}
                className="px-4 py-2.5 rounded-full border border-[#EADBCE] text-xs text-[#827B77]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
