"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/context";
import { QuickRoleSwitcher } from "@/components/ui/QuickRoleSwitcher";
import { Eye, EyeOff, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { siteSettings, login } = useApp();

  const [email, setEmail] = useState("aluna@pilatesemcasa.com.br");
  const [password, setPassword] = useState("aluna123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Por favor, preencha o e-mail e a senha.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      login(email);
      setLoading(false);
      if (email.includes("admin")) {
        router.push("/admin");
      } else {
        router.push("/aluna");
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-between">
      <QuickRoleSwitcher />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.06)] overflow-hidden">
          {/* Top Banner se configurado */}
          {siteSettings.loginBannerUrl && (
            <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-[#F3EAE3]">
              <img
                src={siteSettings.loginBannerUrl}
                alt="Pilates em Casa Banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/20" />
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-6">
            {/* Header com Logo configurável */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#B77D82] text-white font-serif font-bold text-2xl shadow-sm mb-1">
                P
              </div>
              <p className="text-xs uppercase tracking-widest text-[#B77D82] font-semibold">
                {siteSettings.logoText || "Pilates em Casa"}
              </p>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
                {siteSettings.loginTitle || "Bem-vinda de volta!"}
              </h1>
              <p className="text-sm text-[#827B77]">
                {siteSettings.loginSubtitle || "Faça login para acessar seus treinos."}
              </p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            {/* Formulário de Login */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#292321] uppercase tracking-wider">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full px-4 py-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] placeholder:text-[#827B77]/60 focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#292321] uppercase tracking-wider">
                    Senha
                  </label>
                  <Link
                    href="/recuperar-senha"
                    className="text-xs text-[#B77D82] hover:underline font-medium"
                  >
                    Esqueceu sua senha?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha secreta"
                    className="w-full px-4 py-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] placeholder:text-[#827B77]/60 focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 transition pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#827B77] hover:text-[#292321] p-1"
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

              {/* Botão FAZER LOGIN */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-sm tracking-wide shadow-sm hover:shadow transition transform active:scale-[0.99] disabled:opacity-70 cursor-pointer"
              >
                {loading ? "Entrando..." : "FAZER LOGIN"}
              </button>
            </form>

            {/* Separador "ou" */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-[#EADBCE] w-full" />
              <span className="bg-white px-3 text-xs text-[#827B77] uppercase tracking-wider font-medium">
                ou
              </span>
              <div className="border-t border-[#EADBCE] w-full" />
            </div>

            {/* Botão CRIAR MINHA CONTA */}
            <Link
              href="/cadastro"
              className="w-full block text-center py-3 px-6 rounded-full border border-[#B77D82] text-[#B77D82] hover:bg-[#F7EEEE] font-medium text-sm tracking-wide transition"
            >
              CRIAR MINHA CONTA
            </Link>

            {/* Bloco de Acesso Rápido para Teste */}
            <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#EADBCE] text-[11px] text-[#827B77] space-y-1">
              <span className="font-semibold text-[#292321] block">Contas de Acesso Rápido:</span>
              <div className="flex justify-between items-center">
                <span>Aluna: aluna@pilatesemcasa.com.br</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("aluna@pilatesemcasa.com.br");
                    setPassword("aluna123");
                  }}
                  className="text-[#B77D82] font-semibold hover:underline"
                >
                  Preencher
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span>Admin: admin@pilatesemcasa.com.br</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@pilatesemcasa.com.br");
                    setPassword("admin123");
                  }}
                  className="text-[#B77D82] font-semibold hover:underline"
                >
                  Preencher
                </button>
              </div>
            </div>

            {/* Chamada para o Quiz / Plano Personalizado (Item 15) */}
            <div className="pt-2 border-t border-[#EADBCE]">
              <div className="bg-gradient-to-br from-[#FAF7F2] to-[#F3EAE3] p-5 rounded-2xl border border-[#EBD6D5] space-y-3">
                <div className="flex items-center gap-2 text-[#B77D82]">
                  <Sparkles className="w-4 h-4 fill-[#B77D82]/20" />
                  <h2 className="font-serif font-bold text-base text-[#292321]">
                    Ainda não tem seu plano personalizado?
                  </h2>
                </div>
                <p className="text-xs text-[#827B77] leading-relaxed">
                  Responda algumas perguntas rápidas para encontrarmos um ponto de partida adequado à sua rotina e aos seus objetivos.
                </p>
                <Link
                  href="/quiz"
                  className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-[#B77D82] text-white hover:bg-[#A3676C] transition text-xs font-semibold shadow-xs group"
                >
                  <span>Fazer meu Plano Personalizado</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer simples */}
      <footer className="text-center py-4 text-xs text-[#827B77]">
        © 2026 {siteSettings.platformName}. Movimento consciente e bem-estar feminino.
      </footer>
    </div>
  );
}
