"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store/context";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Eye, EyeOff, Sparkles, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { siteSettings, setCurrentUser } = useApp();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sucessoParam = searchParams.get("sucesso");
  const successMessage =
    sucessoParam === "senha_definida"
      ? "Sua senha foi cadastrada com sucesso! Faça login abaixo para acessar a área da aluna."
      : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError("Por favor, preencha seu e-mail e sua senha.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError("O serviço de autenticação não está configurado no momento. Entre em contato com o suporte.");
      return;
    }

    setLoading(true);

    try {
      // 1. Autenticação real com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (authError) {
        if (
          authError.message.includes("Invalid login credentials") ||
          authError.status === 400
        ) {
          setError("E-mail ou senha incorretos. Por favor, confira os dados digitados.");
        } else if (authError.message.toLowerCase().includes("email not confirmed")) {
          setError("Seu e-mail ainda não foi confirmado. Verifique a mensagem enviada para sua caixa de entrada.");
        } else if (authError.message.toLowerCase().includes("too many requests")) {
          setError("Muitas tentativas em sequência. Por favor, aguarde alguns instantes antes de tentar novamente.");
        } else {
          setError("Não foi possível realizar o login. Verifique sua conexão e tente novamente.");
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Sessão não identificada. Tente novamente.");
        setLoading(false);
        return;
      }

      // 2. Carrega perfil correspondente na tabela profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        // Bloquear se o perfil não existe ou não pôde ser carregado
        await supabase.auth.signOut();
        setError("Perfil de aluna não encontrado. Entre em contato com o suporte para verificar sua assinatura.");
        setLoading(false);
        return;
      }

      // 3. Validação estrita de status de acesso ativo:
      // - access_type === 'subscriber' E subscription_status === 'active' | 'trial'; OU
      // - access_type === 'courtesy' E access_expires_at ainda não venceu
      const isSubscriberActive =
        profile.access_type === "subscriber" &&
        (profile.subscription_status === "active" || profile.subscription_status === "trial");

      const isCourtesyActive =
        profile.access_type === "courtesy" &&
        profile.access_expires_at &&
        new Date(profile.access_expires_at).getTime() > Date.now();

      const hasActiveAccess = isSubscriberActive || isCourtesyActive;

      if (!hasActiveAccess) {
        // Bloquear acesso se a usuária não possui acesso de assinante ou cortesia válida
        await supabase.auth.signOut();
        if (profile.access_type === "courtesy") {
          setError("Seu período de cortesia expirou. Para continuar praticando, adquira um plano de assinatura.");
        } else if (profile.access_type === "subscriber") {
          setError("Sua assinatura não está ativa no momento. Entre em contato com o suporte para reativar seu acesso.");
        } else {
          setError("Sua conta não possui uma assinatura ou cortesia ativa associada. Verifique com o suporte.");
        }
        setLoading(false);
        return;
      }

      // Validação complementar de segurança no backend
      if (authData.session?.access_token) {
        try {
          const serverCheck = await fetch("/api/aluna/acesso", {
            headers: {
              Authorization: `Bearer ${authData.session.access_token}`,
            },
          });
          if (!serverCheck.ok) {
            await supabase.auth.signOut();
            setError("Acesso não autorizado pelo servidor. Sua conta não possui uma assinatura ou cortesia ativa.");
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Aviso ao validar acesso no servidor:", e);
        }
      }

      // 4. Montar dados da usuária e encaminhar à área de alunas
      setCurrentUser({
        id: profile.id,
        name: profile.name || cleanEmail.split("@")[0].replace(".", " "),
        email: profile.email || cleanEmail,
        role: profile.role || "aluna",
        avatarUrl: profile.avatar_url || undefined,
        phone: profile.phone || undefined,
        createdAt: profile.created_at || new Date().toISOString(),
        subscriptionStatus: profile.subscription_status || "active",
        subscriptionPlan: profile.subscription_plan || "Mensal",
        subscriptionRenewalDate: profile.subscription_renewal_date || undefined,
        accessType: profile.access_type || "subscriber",
        accessExpiresAt: profile.access_expires_at || null,
        completedLessonIds: profile.completed_lesson_ids || [],
        lastLessonId: profile.last_lesson_id || undefined,
        customPlan: profile.custom_plan || null,
      });

      router.push("/aluna");
    } catch (err: unknown) {
      console.error("Erro no login:", err);
      setError("Erro de comunicação com o servidor. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
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

            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
          <div className="text-xs text-[#827B77]">Carregando tela de login...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
