"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ShieldCheck, ArrowLeft, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Por favor, preencha o e-mail e a senha.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Não foi possível validar o acesso administrativo.");
        setLoading(false);
        return;
      }

      // Redireciona com reload completo para garantir que headers e cookies de sessão sejam lidos
      window.location.href = "/admin";
    } catch {
      setError("Falha na comunicação com o servidor. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-between p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#827B77] hover:text-[#B77D82] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao site
        </Link>
      </div>

      <main className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.06)] p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#B77D82] text-white shadow-sm mb-1">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <p className="text-xs uppercase tracking-widest text-[#B77D82] font-semibold">
              Pilates em Casa · Gestão
            </p>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
              Acesso Administrativo
            </h1>
            <p className="text-sm text-[#827B77] leading-relaxed">
              Painel restrito para os proprietários do projeto. Entre com seu e-mail e senha individuais autorizados.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#292321] uppercase tracking-wider">
                E-mail do Proprietário
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="proprietario@exemplo.com"
                className="w-full px-4 py-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] placeholder:text-[#827B77]/60 focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 transition"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#292321] uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha de proprietário"
                  className="w-full px-4 py-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] placeholder:text-[#827B77]/60 focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 transition pr-11"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#827B77] hover:text-[#292321] p-1 cursor-pointer"
                  aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-sm tracking-wide shadow-sm hover:shadow transition transform active:scale-[0.99] disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? "Validando acesso..." : "ENTRAR NO PAINEL"}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-[#EADBCE] text-center">
            <p className="text-[11px] text-[#827B77] leading-relaxed">
              Autenticação protegida no servidor com variáveis de ambiente. Se você esqueceu sua credencial ou precisa registrar um novo sócio, atualize as chaves privadas no ambiente do servidor.
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-[#827B77]">
        © 2026 Pilates em Casa · Acesso restrito
      </footer>
    </div>
  );
}
