"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/context";
import type { SiteSettings } from "@/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Eye, EyeOff, Sparkles, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export function LoginForm({
  initialEmail,
  sucesso,
  siteSettings,
}: {
  initialEmail: string;
  sucesso: string | null;
  siteSettings: SiteSettings;
}) {
  const router = useRouter();
  const { setCurrentUser } = useApp();

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const successMessage =
    sucesso === "senha_definida"
      ? "Sua senha foi cadastrada com sucesso! Faça login abaixo para acessar a área da aluna."
      : sucesso === "senha_redefinida"
      ? "Sua nova senha foi salva com sucesso! Faça login com a nova senha para acessar sua conta."
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

      // 2. Consulta autoritativa de acesso no servidor com o token da sessão
      let hasAccess = false;
      let profileData = null;

      if (authData.session?.access_token) {
        try {
          const res = await fetch("/api/aluna/acesso", {
            headers: {
              Authorization: `Bearer ${authData.session.access_token}`,
            },
          });
          const json = await res.json().catch(() => ({}));
          if (res.ok && json.hasAccess) {
            hasAccess = true;
            profileData = json.profile;
          } else if (res.status === 403) {
            hasAccess = false;
            profileData = json.profile;
          }
        } catch (serverErr) {
          console.warn("[login] Falha na consulta da API de acesso:", serverErr);
        }
      }

      // Fallback local via RLS caso a chamada de API não tenha respondido
      if (!profileData) {
        const { data: rlsProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (rlsProfile) {
          profileData = rlsProfile;
          const isSubscriberActive =
            (rlsProfile.access_type === "subscriber" || !rlsProfile.access_type) &&
            (rlsProfile.subscription_status === "active" || rlsProfile.subscription_status === "trial");

          const isCourtesyActive =
            rlsProfile.access_type === "courtesy" &&
            rlsProfile.access_expires_at &&
            new Date(rlsProfile.access_expires_at).getTime() > Date.now();

          hasAccess = Boolean(isSubscriberActive || isCourtesyActive);
        }
      }

      // Se o perfil não for encontrado ou não tiver acesso ativo
      if (!hasAccess) {
        await supabase.auth.signOut();
        if (profileData?.access_type === "courtesy") {
          setError("Seu período de cortesia expirou. Para continuar praticando, adquira um plano de assinatura.");
        } else if (
          profileData?.subscription_status === "inactive" ||
          profileData?.subscription_status === "canceled"
        ) {
          setError("Sua assinatura não está ativa no momento. Entre em contato com o suporte para reativar seu acesso.");
        } else {
          setError("Sua conta não possui uma assinatura ou cortesia ativa associada. Verifique com o suporte.");
        }
        setLoading(false);
        return;
      }

      // 3. Montar dados da usuária e encaminhar à área de alunas
      if (profileData) {
        setCurrentUser({
          id: profileData.id,
          name: profileData.name || cleanEmail.split("@")[0].replace(".", " "),
          email: profileData.email || cleanEmail,
          role: profileData.role || "aluna",
          avatarUrl: profileData.avatar_url || undefined,
          phone: profileData.phone || undefined,
          createdAt: profileData.created_at || new Date().toISOString(),
          subscriptionStatus: profileData.subscription_status || "active",
          subscriptionPlan: profileData.subscription_plan || "Mensal",
          subscriptionRenewalDate: profileData.subscription_renewal_date || undefined,
          accessType: profileData.access_type || "subscriber",
          accessExpiresAt: profileData.access_expires_at || null,
          completedLessonIds: profileData.completed_lesson_ids || [],
          lastLessonId: profileData.last_lesson_id || undefined,
          customPlan: profileData.custom_plan || null,
        });
      }

      // 4. Redirecionamento completo para garantir envio limpo dos cookies pelo navegador ao servidor
      window.location.href = "/aluna";
    } catch (err: unknown) {
      console.error("Erro no login:", err);
      setError("Erro de comunicação com o servidor. Verifique sua conexão e tente novamente.");
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
                className="w-full py-3.5 px-6 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white font-medium text-sm tracking-wide shadow-sm hover:shadow transition transform active:scale-[0.99] disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Entrando na sua conta...</span>
                  </>
                ) : (
                  <>
                    <span>FAZER LOGIN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

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
