"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/context";
import { Eye, EyeOff, Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { siteSettings, login } = useApp();

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
    login(email, "aluna");
    router.push("/aluna");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-between">
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
              {siteSettings.logoUrl ? (
                <div className="flex justify-center mb-1">
                  <img
                    src={siteSettings.logoUrl}
                    alt={siteSettings.logoText || "Pilates em Casa"}
                    className="h-14 w-auto max-w-[180px] object-contain rounded-xl"
                  />
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#B77D82] text-white font-serif font-bold text-2xl shadow-sm mb-1">
                  P
                </div>
              )}
              {siteSettings.logoText && (
                <p className="text-xs uppercase tracking-widest text-[#B77D82] font-semibold">
                  {siteSettings.logoText}
                </p>
              )}
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

            {/* Formulário de Login da Aluna */}
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
                    placeholder="Sua senha"
                    className="w-full px-4 py-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] placeholder:text-[#827B77]/60 focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 transition pr-11"
                    required
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

              {/* Botão FAZER LOGIN */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-sm tracking-wide shadow-sm hover:shadow transition transform active:scale-[0.99] disabled:opacity-70 cursor-pointer"
              >
                {loading ? "Entrando..." : "FAZER LOGIN"}
              </button>
            </form>

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
        Vitta Pilates. Todos os direitos reservados.
      </footer>
    </div>
  );
}
