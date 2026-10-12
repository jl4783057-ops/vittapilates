"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/context";
import { Eye, EyeOff, ShieldCheck, Check } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { siteSettings, users, setUsers, setCurrentUser } = useApp();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Todos os campos são obrigatórios.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve conter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas informadas não coincidem.");
      return;
    }

    if (!agreeTerms) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade para prosseguir.");
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      setError("Já existe uma conta registrada com este e-mail.");
      return;
    }

    setLoading(true);

    const newUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: "aluna" as const,
      createdAt: new Date().toISOString(),
      subscriptionStatus: "active" as const, // inicia como aluna ativa para permitir experiência fluida
      subscriptionPlan: "Mensal" as const,
      completedLessonIds: [],
    };

    setTimeout(() => {
      setUsers((prev) => [newUser, ...prev]);
      setCurrentUser(newUser);
      setLoading(false);
      router.push("/aluna");
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-md w-full mx-auto my-auto bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] shadow-[0_8px_30px_rgba(41,35,33,0.06)] p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#B77D82] text-white font-serif font-bold text-2xl shadow-sm mb-1">
            P
          </div>
          <p className="text-xs uppercase tracking-widest text-[#B77D82] font-semibold">
            {siteSettings.logoText || "Pilates em Casa"}
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
            Comece Sua Prática
          </h1>
          <p className="text-sm text-[#827B77]">
            Crie sua conta e tenha acesso às aulas e à comunidade exclusiva.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#292321] uppercase tracking-wider">
              Nome Completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mariana Silveira"
              className="w-full px-4 py-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#292321] uppercase tracking-wider">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              className="w-full px-4 py-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#292321] uppercase tracking-wider">
              Senha (mínimo 6 caracteres)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crie sua senha segura"
                className="w-full px-4 py-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 transition pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#827B77] hover:text-[#292321] p-1"
                aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#292321] uppercase tracking-wider">
              Confirmar Senha
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita sua senha"
              className="w-full px-4 py-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-sm text-[#292321] focus:outline-none focus:ring-2 focus:ring-[#B77D82]/50 transition"
              required
            />
          </div>

          <div className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 rounded border-[#EADBCE] text-[#B77D82] focus:ring-[#B77D82]"
            />
            <label htmlFor="terms" className="text-xs text-[#827B77] leading-relaxed cursor-pointer">
              Li e concordo com os{" "}
              <span className="text-[#292321] font-semibold underline">Termos de Uso</span> e a{" "}
              <span className="text-[#292321] font-semibold underline">Política de Privacidade</span>.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-sm tracking-wide shadow-sm hover:shadow transition disabled:opacity-70 cursor-pointer"
          >
            {loading ? "Criando sua conta..." : "CONCLUIR CADASTRO"}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#EADBCE]">
          <p className="text-xs text-[#827B77]">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-[#B77D82] font-semibold hover:underline">
              Fazer Login
            </Link>
          </p>
        </div>
      </div>

      <footer className="text-center py-3 text-xs text-[#827B77]">
        © 2026 {siteSettings.platformName}. Todos os direitos reservados.
      </footer>
    </div>
  );
}
